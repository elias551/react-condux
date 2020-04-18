# react-condux

Yet another state manager for react, based on Context API.

## Usage

You can define your context and your actions this way:

```ts
import { buildContext } from "react-condux"

interface ContextState {
  currentValue: number
}

const { createAction, createActions, useContext, Provider } = buildContext<
  ContextState
>()

export const useAppContext = useContext
export const AppContextProvider = Provider

export const actions = createActions({
  setValue: (value: number) => async ({ produceState, getState }) => {
    const state = getState()
    await produceState((draft) => {
      draft.currentValue = state.currentValue + value
    })
  },
  increment: () => async ({ getState }) => {
    await getState().dispatch(actions.setValue(1))
  },
  decrement: () => async ({ getState }) => {
    await getState().dispatch(actions.setValue(-1))
  },
})

```

Then your context can be used this way:

```jsx

import React from "react"

import "./App.css"
import { AppContextProvider, useAppContext, actions } from "./context"

export const App = () => (
  <div className="App">
    <header className="App-header">
      <AppContextProvider initialValue={{ currentValue: 5 }}>
        <ContextConsumer />
      </AppContextProvider>
    </header>
  </div>
)

export const ContextConsumer = () => {
  const { currentValue, dispatch } = useAppContext()

  const increment = () => dispatch(actions.increment())
  const decrement = () => dispatch(actions.decrement())

  return (
    <div>
      <p>Current value: {currentValue}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  )
}


```