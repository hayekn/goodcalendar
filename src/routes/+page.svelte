<script>
  import Login from "./login.svelte";
  import Question from "./question.svelte";
  import Calendar from "./calendar.svelte";

  import { auth, db } from "../firebase.js";
  import { onAuthStateChanged, signOut } from "firebase/auth";
  import { doc, getDoc, setDoc } from 'firebase/firestore';

  import '../app.css';
  import { onMount } from "svelte";

  let user = null;
  let selectedEntry = null;
  let reloadCounter = 0;
  let invert = false;

  onAuthStateChanged(auth, (u) => {
    user = u;
  });

  function handleLoggedIn(event) {
    user = { uid: event.detail.uid };
  }

  async function invertColors() {
    if (!user) return;
    invert = !invert;
    // await setDoc(doc(db, "users", user.uid), { invert }, { merge: true });
  }

  function handleSaved() {
    reloadCounter += 1; 
  }

  function logout() {
    signOut(auth);
    user = null;
    selectedEntry = null;
  }

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
    justify-content: space-between;
    padding-left: 5%;
    padding-right: 5%;
    margin-bottom: 5%;">
    <button on:click={logout}>Log Out</button>
    <button on:click={invertColors}
    style:background-color={invert ? 'hsl(0, 70%, 65%)' : 'hsl(120, 70%, 65%)'}>
      Invert Colors</button>
    </div>
    </div>
{/if}