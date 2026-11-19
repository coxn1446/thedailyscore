# Screens

Later prompts match these layouts. Groups, governance, the Home paste desk, the score feed, and Profile are live. The Groups game filter and time period stay on the route (`?game=` and `?period=`) and are kept when the reader switches groups. Do not move them back inside one group. Home does not carry a kicker or deck under the paste headline.

## Chrome

Edition line: date and “YOUR DAILY GAMES. ONE SCORE.” No latest-sync clock. The signed-in masthead is that edition line and, on a wide screen, the text links Home / Board / Profile. The wordmark and portrait stay on the sign-in panel and the mobile Profile tab. Create account omits the wordmark. Forgot password on sign-in shows the toast “Reach Out to Will.” Google and Apple sit under that control. On create account they sit under Create account. No desktop footer. Mobile tab bar is Home, Board, and Profile: each item is an icon with its name underneath, and Profile uses the reader’s portrait. Safe areas stay. `/groups`, `/messages`, and `/join/:token` open Board.

## Home empty

Headline “What did you play today?”, monospace textarea with placeholder “copy and paste your score from any daily game here.”, Submit (⌘/Ctrl+Enter). On a phone the Submit button is a bar the width of the content. On a wide screen the paste desk is centered in the pane. No kicker and no deck under the headline. Map Tap, Krillion, Size it Up, Wordle, Redactle, Time Guesser, Semantle, Farflung, Eraly, Fermi, Hivemind, and Noillirk stay linked along the bottom of the screen.

## Home preview

Recognized game, puzzle number, score, and share grid. Post and Edit. Post sits at the end of that row, where Submit sat. No group checklist. An older puzzle backfills that day. A repeated puzzle is rejected. An unrecognized paste says “Game not recognized.” and links to Request a game.

## Home posted

A successful post clears the paste field. Today’s global rank is a toast. Share to Instagram stays on the paste row. Share offers Today or This week, then Paper, Ink, or Carmine. The card ends with thedailyscore.site.

## Board

One register for the selected game. Global and Friends are the two scopes. Directory of groups is gone. The game filter sits on a module ground and shows each game’s logo. The time period sits on an inset ground: Today, Week, All time, or Custom. On a phone those filters stack. Week and All time toggle Scores and Leaderboard. The reader’s rank sits above the list. Friends adds a handle field, incoming requests, outgoing requests, and accepted friends above the register. An empty friends list reads “No friends yet.”

## Groups

Not in the product. `/groups` redirects to Board. The layout below is the dormant group desk.

Directory of the user’s groups that have the route’s selected game enabled. A group that is not playing that game is left off the list. Each card shows the name, member count, today’s score count, and enabled-game chips. The reader’s score sits left of an ordinal rank (`1st`) at the right edge of the card. The card shows submissions over possible submissions for the selected period (`x/y`). A day is one possible submission per member. A week is seven. Mobile shows the directory until a group is opened. Desktop shows the directory and the register together. Time period is Today, Week, All time, or Custom, and it is route state next to the game filter. The game filter sits on a module ground and the time period sits on an inset ground. On a phone the game filter, the time period, and the custom dates each sit on their own line. Custom dates filter the register by puzzle day. The register lists individual scores for that period, highest first, the same player as many times as they have scores. Each row reads “Display Name - puzzle date”, using the day the puzzle was posted. The directory is the caller’s standing in each group. Today’s columns are Score and Rank. Week and Custom rank by total points and show Total Points, Average, and Rank. All time ranks by best score and shows Best, Average, and Rank. Those numbers share one size, under column headers. Settings opens governance. Create a Group is name, tagline, and initial games. On a phone that form opens in a dialog.

## Governance

Title bar is ← Back, the group name, and Save Changes when the name or the game matrix has changed. Three tabs: Games, Roster, Controls. Games is the on/off matrix and stays local until Save Changes. Roster lists members. A curator copies “Please join my group [name] on The Daily Score” and the join URL. The link is not shown, and a toast reports success or failure. Controls holds a Notifications label over sliding Messages and Scores toggles, Leave group, and Archive group. The page scrolls so Archive group stays reachable. Profile lists archived groups a curator can restore.

## Profile

Three tabs. Stats is first: best marks in columns for the score and the day it was attained, and one block per game played. Game Archive lists each filed score. The reader can delete it or change which groups it is shared with. A score game shows the highest score and, in the record, games played and average score. Wordle shows the fewest guesses, and its record is solved count and average guesses. Redactle’s best is the fewest guesses. Time, hints, and give-ups sit in a tooltip on the average. Profile edits the round portrait, display name, handle, and email. Choose file stores the portrait. Save appears after a name, handle, or email change. Archived groups a curator can restore are listed here. Settings holds Notifications and Night mode. Export CSV, Sign Out, and Delete Profile are the same size and centered. Delete Profile opens a branded dialog: deletion is permanent and cannot be reversed.

## Parlor

On a phone, a chat icon beside Settings opens that group’s chat in one modal. The reader flips between the group’s enabled games inside the modal. A game they have not posted today reads “You haven't played this game yet today, submit your score here to unlock the chat,” and here links Home. The unread count sits on the chat icon. Messages is a mobile tab; its badge is the number of unlocked conversations with unread messages. Each row is the game mark, the group name, and up to three portraits of the most recent chatters. Rows are taller than a caption line. There is no Game Name column and no latest-message preview. A game stays off the list until today’s score is posted. Opening a row uses the same modal, still able to flip games. On a wide screen the conversation is the third column and follows the page game filter. Create a Group is a plus beside Directory, and an X closes that form. Custom dates use a calendar mark. Directory, the group name, and Chat use the same headline. The directory columns are Daily Rank, Weekly Rank, and All Time Rank. The reader’s score for the selected game and period sits above the list. The composer stays at the bottom of the chat. On a phone, focusing the message field waits a moment, then docks Send on the settled keyboard. The phone shell stays the height of the device, and scrolling the chat does not move the app. Send keeps the keyboard open. Each message shows that member’s portrait, or their initial when they have none. A smiley sits immediately to the right of each message and opens Heart, Thumbs Up, Thumbs Down, Haha, Exclamation, or Question. Settings holds Messages and Scores alerts for that group.
