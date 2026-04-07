# nemo-pet (v1)

An extension for Pi featuring **Nemo**, a cute orange cat that reacts to your coding session!

> **Note:** This is version 1. Some states may not have been fully observed or tested in all scenarios yet.

## Features

Nemo changes his mood based on what's happening in your Pi session:

- 🐱 **Idle**: Just hanging out.
- 😴 **Sleeping**: Nemo falls asleep when you are inactive.
- 🎮 **Playing**: Becomes active when an agent starts working or a tool is called.
- 😊 **Happy**: Celebrates when tasks or tool calls are completed.
- 🍽️ **Eating**: Nemo eats whenever you are typing or providing input.
- 🧼 **Cleaning**: Nemo cleans himself during context compaction.

## Preview

Here is what Nemo looks like in his idle state:

```text
  /\___/\  
=( o w o )=
```

## Installation

The extension is automatically discovered by pi when placed in `~/.pi/agent/extensions/`.

## Usage

Once loaded, Nemo will appear below the editor in the status bar and automatically animate.

## License

MIT
