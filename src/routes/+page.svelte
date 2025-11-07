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
  <div style="left: 5%; bottom: 5%; position: absolute">
  <button on:click={logout}>Log Out</button>
  <!-- <input type="checkbox" bind:checked={invert}> -->
  </div>

  <!-- pass selectedEntry to Question -->
  <Question user={user} externalEntry={selectedEntry} onSaved={handleSaved} invert={invert}/>

  <!-- Calendar emits onSelectEntry when a box is clicked -->
  <Calendar user={user} onSelectEntry={handleSelectEntry} reloadTrigger={reloadCounter} invert={invert}/>
{/if}
