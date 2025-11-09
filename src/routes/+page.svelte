<script>
  import Login from "./login.svelte";
  import Question from "./question.svelte";
  import Calendar from "./calendar.svelte";

  import { auth, db } from "../firebase.js";
  import { onAuthStateChanged, signOut } from "firebase/auth";
  import { doc, getDoc, setDoc } from 'firebase/firestore';

  import '../app.css';
  import { onMount } from "svelte";

  import lightbulb from "$lib/lightbulb-regular.svg"

  let user = null;
  let selectedEntry = null;
  let reloadCounter = 0;
  let invert = null;
  let hint = false;

  onAuthStateChanged(auth, (u) => {
    loadColorPreference(u);
    user = u;
  });

  async function invertColors() {
    if (!user) return;
    invert = !invert;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, {colorPreference: invert, timestamp: Date.now()}, { merge: true });
    console.log("Saved user profile invert="+invert)
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

  async function loadColorPreference(user){
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      invert = snap.data().colorPreference;
      console.log("Loaded user profile invert="+invert);
    } else {
      invert = false;
    }
  }

  onMount(loadColorPreference);

</script>

<style>
  :global(body) {
        font-family: 'Comic Sans MS', 'MyComic';
        margin: 0;
    }
</style>

{#if !user}
  <Login/>
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
    <div>
    <button on:click={logout}>Log Out</button>
    <button on:click={() => {hint = !hint}} style="padding: .3rem inherit;"><img src={lightbulb} width="12px" style="transform: translateY(15%);"></button>
    </div>
    {#if invert!=null} 
    <button on:click={invertColors}
    style:background-color={invert ? 'hsl(0, 70%, 65%)' : 'hsl(120, 70%, 65%)'}>
      Invert</button>
    {/if}
    {#if hint}
    <div class="overlay">
      <div style="width: 65%; text-align:left"><span>Click on the top half of the current date to log an entry for <strong>today</strong>. Click on the bottom half to log an entry for <b>tonight</b>. Entries are only editable on the current day.
      <br><br>To reverse the red-green color scheme, click "Invert" in the bottom-right corner. Your preferences will be saved for the next time you login!</span></div>
    <br><br>
      <button on:click={() => {hint=!hint}}>Return</button>
    </div>
    {/if}
    </div>
    </div>
{/if}