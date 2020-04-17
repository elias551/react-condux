# react-condux

Yet another state manager for react, based on Context API.

## Usage

You can define your context and your actions this way:

```ts

import { buildContext } from "react-condux"

const { createAction, useContext, Provider } = buildContext({ currentValue: 5 })

export const useAppContext = useContext
export const AppContextProvider = Provider

export const setValueAction = createAction(
  (value: number) => async (produceState, getState) => {
    const state = getState()
    await produceState((draft) => {
      draft.currentValue = state.currentValue + value
    })
  }
)

export const incrementAction = createAction(() => async (_, getState) => {
  await getState().dispatch(setValueAction(1))
})

export const decrementAction = createAction(() => async (_, getState) => {
  await getState().dispatch(setValueAction(-1))
})

```

Then your context can be used this way:

```jsx

import React from "react"

import "./App.css"
import {
  AppContextProvider,
  useAppContext,
  incrementAction,
  decrementAction,
} from "./app-context/context"

export const App = () => (
  <div className="App">
    <header className="App-header">
      <AppContextProvider initialValue={{ currentValue: 5 }}>
        <Incrementor />
      </AppContextProvider>
    </header>
  </div>
)

export const Incrementor = () => {
  const context = useAppContext()

  const increment = () => context.dispatch(incrementAction())
  const decrement = () => context.dispatch(decrementAction())

  return (
    <div>
      <p>Current value: {context.currentValue}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  )
}


```