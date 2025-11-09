# 🏛️ My App's Architecture (The "Why")

Hi there! This document explains the "why" behind my app's design.

The guiding philosophy was simple: The server must be the "boss."

To make a truly collaborative app, we can't let every user's browser be in charge of its own state. That leads to chaos and bugs. Instead, we made the server the single source of truth, and all the clients (browsers) are just "mirrors" that show what the server says.

## 1. The Core Idea: The "Operation Log"

I had to choose how to sync the drawing:

    Option 1: Streaming (draw:move): Send a tiny message on every single mouse movement.

    Option 2: Operation Log (draw:operation): Send one complete line object when the user's mouse is released.

I had to chose the Operation Log (opStore) because it is a vastly superior architecture. Instead of sending messy, "half-drawn" lines back and forth, this is a clean and simple Operation Log.

*** Here's the concept: ***

    The server keeps a master list (an array called opStore) of every single line ever drawn.

    When you draw a line, you're only drawing a preview on your own screen.

    When you let go of the mouse, your browser packages up that entire finished line (all its points, the color, the width, the tool) into a single "operation" object.

    It sends this one, complete operation to the server.

    The server adds it to the master opStore list and then broadcasts that operation to everyone.

    Everyone's browser (including yours) then draws that final, smoothed line.

This approach is fantastic because it's efficient (one message per line) and keeps everyone perfectly in sync.

## 2. The "Tricky Part": Global Undo & Redo

The assignment called this the "tricky part," but my Operation Log architecture makes it simple.

Since the server has the master list of all drawings, "Undo" is just a case of asking the server to manage two lists:

    opStore: The main list of what's on the canvas.

    redoStore: A "trash can" for drawings we've undone.

When anyone hits "Undo":

    We tell the server, "Hey, undo please!" (opStore:undo).

    The server pop()s the last drawing off the opStore and push()es it into the redoStore.

    It then broadcasts the new, shorter opStore to everyone.

    Everyone's browser just clears and redraws their canvas from this new list.

When anyone hits "Redo":

    It's the exact reverse! The server moves an operation from the redoStore back to the opStore and tells everyone to redraw.

This is "global" because anyone can undo anyone's last line. It's a truly collaborative history.

## 3. Why There Are No "Conflicts"

What happens if two people draw at the exact same time?

It doesn't matter. The server is like a bouncer at a club: it only lets one person's operation in at a time.

It will get User A's drawing, add it to the opStore, then get User B's drawing and add it. There is no "conflict" because the server creates the official, final order of events, one by one. This makes the app incredibly stable.

## 4. Other Features (The "Side Systems")

We handled other features as separate, simple systems:

    Live Cursors: These are "fire-and-forget." On every mouse move, you emit('cursor:move'). The server just broadcasts this to other users. We don't save this data—it's temporary, real-time, and just for show.

    Online User List: This is also simple. The server keeps a list (onlineUsers). When someone connects or disconnects, the server just sends the entire new list to everyone.

## 5. Our App's "Language" (The Event Map)

This is the list of messages our client and server use to talk to each other.

*** Client tells Server... (C -> S) ***

    requestFullCanvas: (On connect) "Hey, I just got here! Send me the whole drawing."

    draw:operation: "I finished a line! Here's the complete object for it."

    opStore:undo: "Someone clicked 'Undo'. Please undo the last global action."

    opStore:redo: "Someone clicked 'Redo'. Please redo the last undone action."

    opStore:clear: "Someone clicked 'Clear'. Please wipe the whole canvas."

    cursor:move: "Here's my current mouse position. Tell everyone else."

*** Server tells Client... (S -> C) ***

    fullCanvas: (To one user) "Welcome! Here is the entire list of all drawings."

    draw:operation: (To all users) "A new line was just drawn. Add this to your canvas."

    opStore:load: (To all users) "The history has changed (due to undo/redo/clear). Reload! Here is the new, complete list of drawings."

    users:update: (To all users) "The user list has changed. Here is the new list."

    cursor:move: (To other users) "User [ID] just moved their mouse here."

    user:disconnect: (To all users) "User [ID] left. You can remove their cursor."