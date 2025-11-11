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


  let selectedCalendar = 0;
  let newCalendar = "";
  let renameCalendar = "";
  let calendars = ["Calendar 1", "Calendar 2", "Calendar 3"]
  let currIndex = 0;

  let menu = false;

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


  // function handleSelectCalendar(event) {
  //   if (event.target.selectedIndex < calendars.length)
  //     {console.log("changed");
  //     currIndex = event.target.selectedIndex;}

  //   console.log("current = "+currIndex);
  // }
  // async function saveNewCalendar(){
  //   if (!user) return;
  //   selected=newCalendar; 
  //   calendars = [...calendars, newCalendar];  
  //   const ref = doc(db, "users", user.uid);
  //   await setDoc(ref, {calendars: calendars, timestamp: Date.now()}, { merge: true });
  //   console.log("Saved "+newCalendar+" to calendars");
  //   newCalendar="";
  //   currIndex = calendars.length-1;

  //   console.log("current = "+currIndex);
  // }
  // async function saveRenameCalendar(){
  //   if (!user) return;
  //   calendars[currIndex] = renameCalendar;
  //   calendars = [...calendars];
  //   selected=renameCalendar;

  //   console.log("current = "+currIndex);
  //   // const ref = doc(db, "users", user.uid);
  //   // await setDoc(ref, {calendars: calendars, timestamp: Date.now()}, { merge: true });
  //   // console.log("Saved "+newCalendar+" to calendars");
  //   // newCalendar="";
  // }

  //   async function saveDeleteCalendar(){
  //   if (!user) return;
  //   calendars.splice(currIndex);
  //   calendars = [...calendars];
  //   selected = calendars[currIndex]

  //   console.log("current = "+currIndex);
  //   // const ref = doc(db, "users", user.uid);
  //   // await setDoc(ref, {calendars: calendars, timestamp: Date.now()}, { merge: true });
  //   // console.log("Saved "+newCalendar+" to calendars");
  //   // newCalendar="";
  // }





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
        <button on:click={() => {hint = !hint}} style="padding: .4rem inherit;"><img src={lightbulb} width="12px" style="transform: translateY(15%);"></button>
      </div>
      {#if invert!=null} 
      <div>
        <!-- <button on:click={menu=!menu}
        style="padding: .4rem inherit;">
          Calendars
        </button> -->
        {#if menu}
          <div class="overlay">
            <span>
            {#each calendars as calendar, i}
              <button on:click={selectedCalendar=i}
              style={selectedCalendar===i ? "border: 2px dashed #339FFF;" : ""+("margin: .5rem")}>{calendar}</button>
            {/each}
            </span><br>
            <span>
            <button on:click={() => {renameCalendar(i)}}>Rename</button>
            <button on:click={() => {deleteCalendar(i)}}>Delete</button>
            <button on:click={() => {addCalendar(i)}}>New</button>
            </span><br>
            <button on:click={menu=!menu}>Return</button>
          </div>
        {/if}
        <!-- <select style="padding: .4rem inherit;" id="selector"
        bind:value={selected} on:change={(event) => {console.log(selected); handleSelectCalendar(event)}}>
          {#each calendars as calendar}
            <option value={calendar}>{calendar}</option>
          {/each}
          <option value="&&&&rename">Rename Current</option>
          <option value="&&&&delete">Delete Current</option>
          <option value="&&&&new">Add New</option>
        </select>
        {#if selected==="&&&&new"}
          <div class="overlay">
            <input type="text" bind:value={newCalendar} placeholder="Calendar Name"><br>
            <button on:click={saveNewCalendar}>Add</button>
          </div>
        {/if}
        {#if selected==="&&&&rename"}
          <div class="overlay">
            <input type="text" bind:value={renameCalendar} placeholder="Calendar Name"><br>
            <button on:click={saveRenameCalendar}>Rename</button>
          </div>
        {/if}
        {#if selected==="&&&&delete"}
          <div class="overlay">
            Are you sure?
            <button on:click={saveRenameCalendar}>Confirm</button>
            <button on:click={saveRenameCalendar}>Back</button>
          </div>
        {/if} -->
        <button on:click={invertColors}
        style:background-color={invert ? 'hsl(0, 70%, 65%)' : 'hsl(120, 70%, 65%)'}>
          Invert
        </button>
      </div>
      {/if}
      {#if hint}
        <div class="overlay">
          <div style="width: 65%; text-align:left">
            <span>Click on the top half of the current date to log an entry for <strong>today</strong>. Click on the bottom half to log an entry for <b>tonight</b>. Entries are only editable on the current day.
            <br><br>To reverse the red-green color scheme, click "Invert" in the bottom-right corner. Your preferences will be saved for the next time you login!</span>
          </div>
          <br><br>
          <button on:click={() => {hint=!hint}}>Return</button>
        </div>
      {/if}
    </div>
  </div>
{/if}