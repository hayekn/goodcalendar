<script>
  import Login from "./login.svelte";
  import Question from "./question.svelte";
  import Calendar from "./calendar.svelte";
  import { auth } from "../firebase.js";
  import { onAuthStateChanged, signOut } from "firebase/auth";
  import '../app.css';

  let user = null;
  let selectedEntry = null; // holds the calendar-selected entry
  let reloadCounter = 0;
  let invert = false;

  onAuthStateChanged(auth, (u) => {
    user = u;
  });

  function handleLoggedIn(event) {
    user = { uid: event.detail.uid };
  }
  function handleSaved() {
    reloadCounter += 1; 
  }


  function logout() {
    signOut(auth);
    user = null;
    selectedEntry = null;
  }

  // called by Calendar when a day/minute is clicked
  function handleSelectEntry(entry) {
    selectedEntry = entry;
  }
</script>

<style>
  :global(body) {
        font-family: 'Comic Sans MS', 'MyComic';
        margin: 0;
    }
</style>

{#if !user}
  <Login on:loggedin={handleLoggedIn}/>
{:else}
  <div style="display: flex;
  flex-direction: column;
  min-height: 100vh;">
    <div style="flex-grow: 1;">
    <Question user={user} externalEntry={selectedEntry} onSaved={handleSaved} invert={invert}/>
    <Calendar user={user} onSelectEntry={handleSelectEntry} reloadTrigger={reloadCounter} invert={invert}/>
    </div>

    <div style="display: flex;
    justify-content: flex-start;
    padding-left: 5%;
    margin-bottom: 5%;">
    <button on:click={logout}>Log Out</button>
    </div>
  </div>
{/if}
