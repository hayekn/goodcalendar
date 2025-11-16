<script>
  import Login from "./login.svelte";
  import Question from "./question.svelte";
  import Calendar from "./calendar.svelte";

  import { auth, db } from "../firebase.js";
  import { onAuthStateChanged, signOut, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
  import { doc, getDoc, setDoc, updateDoc, waitForPendingWrites } from 'firebase/firestore';

  import '../app.css';
  import { onMount } from "svelte";

  import lightbulb from "$lib/lightbulb-regular.svg"
    import { error } from "@sveltejs/kit";

  let user = null;
  let selectedEntry = null;

  let reloadCounter = 0;
  let invert = null;
  let hint = false;

  let calendars = null;
  let selectedCalendar = null;
  let newCal = "";
  let renamedCal = "";
  let overlaySelector = "";
  let currIndex = 0;
  let password = ""
  let errormsg = ""

  let menu = false;

  onAuthStateChanged(auth, (u) => {
    loadUserData(u);
    user = u;
  });

  async function invertColors() {
    if (!user) return;
    invert = !invert;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, {colorPreference: invert, timestamp: Date.now()}, { merge: true });
    console.log("Saved user profile invert="+invert)
  }

  function renameCalendar(){
    if (renamedCal===""){
      errormsg = "New name cannot be empty!";
    }
    else if (Object.values(calendars).includes(renamedCal)){
      errormsg = "New name cannot be a duplicate!";
    } 
    else {
      calendars[selectedCalendar]=renamedCal;
      updateCalendars();

      renamedCal="";
      errormsg = "";
      overlaySelector="";
    }
  }
  function deleteCalendar(){
    reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)).then(() => {
      if (Object.keys(calendars).length===1){
        errormsg = "You cannot delete your last calendar!"
        password = ""
      }
      else {
        delete calendars[selectedCalendar];
        console.log(selectedCalendar);
        calendars = { ...calendars };
        console.log(calendars);

        updateCalendars();

        selectedCalendar = Object.keys(calendars)[0];
        password = ""
        errormsg = ""
        overlaySelector = "";
      }
    }).catch((error) => {
      errormsg = "Incorrect password!"
    });
  }
  function newCalendar(){
    if (newCal === ""){
      errormsg = "New name cannot be empty!"
    } else if (Object.values(calendars).includes(newCal)){
      errormsg = "New name cannot be a duplicate!";
    } else {
      const timestamp = Date.now().toString();
      calendars[timestamp] = newCal;
      calendars = { ...calendars };
      updateCalendars();

      selectedCalendar = timestamp;
      errormsg = "";
      newCal=""
      overlaySelector=""
    }
  }
  async function updateCalendars(){
    if (!user) return;
    const timestamp = Date.now()
    const ref = doc(db, "users", user.uid);
    const name = (user.email ? user.email.replace("@tracker.app", "") : "anonymous"+timestamp.toString());

    if (ref.calendars)
      await updateDoc(ref, {calendars: calendars, selectedCalendar: selectedCalendar, timestamp: timestamp});
    else {
      await setDoc(ref, {calendars: calendars, selectedCalendar: selectedCalendar, name: name, timestamp: timestamp});
    }
    console.log("Saved calendars to database");
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

  async function loadUserData(user){
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const userData = snap.data();

      if (userData.calendars){
        calendars = userData.calendars;
        selectedCalendar = userData.selectedCalendar;
        console.log("Loaded user calendars");
      }
      else{
        calendars = {};
        const timestamp = Date.now().toString();
        calendars[timestamp] = "Calendar 1";
        selectedCalendar = timestamp;
        await updateCalendars();
        console.log("Initialized user calendars");
      }
      if (userData.colorPreference){
        invert = userData.colorPreference;
        console.log("Loaded user invert="+invert);
      } else{
        invert = false;
        console.log("Initialized user invert="+invert);
      }

    } else{
      invert = false;
      calendars = {};
      const timestamp = Date.now().toString();
      calendars[timestamp] = "Calendar 1";
      selectedCalendar = timestamp;
      await updateCalendars();

      console.log("New user.");
    }
}


</script>

<style>
  :global(body) {
        font-family: 'Comic Sans MS', 'MyComic';
        margin: 0;
    }
</style>

{#if !user || !selectedCalendar}
  <Login/>
{:else}
  <div style="display: flex;
  flex-direction: column;
  min-height: 100vh;">
    <div style="flex-grow: 1;">
    <Question user={user} externalEntry={selectedEntry} onSaved={handleSaved} invert={invert} selectedCalendar={selectedCalendar}/>
    <Calendar user={user} onSelectEntry={handleSelectEntry} reloadTrigger={reloadCounter} invert={invert} selectedCalendar={selectedCalendar}/>
    </div>

    <div style="display: flex;
    justify-content: space-between;
    gap: .5rem;
    flex-wrap: wrap;
    padding-left: 5%;
    padding-right: 5%;
    margin-bottom: 5%;">
      <div style="order: 2; flex-wrap: wrap; gap:.5rem;display: flex">
        <button on:click={logout}>Log Out</button>
        <button on:click={() => {hint = !hint}} style="padding: .4rem inherit;"><img src={lightbulb} width="12px" style="transform: translateY(15%);"></button>
      </div>
      {#if invert!=null} 
      <div style="order: 1; flex-wrap: wrap; gap:.5rem;display: flex">
        <button on:click={() => {menu=!menu}}
        style="padding: .4rem inherit; border: 2px dashed #339FFF;">
          <b>{calendars[selectedCalendar]}</b>
        </button>
        {#if menu}
          <div class="overlay">
            <span>
            {#each Object.keys(calendars).sort() as id}
              <button on:click={() => {selectedCalendar=id; updateCalendars()}}
              style={(selectedCalendar===id ? "border: 2px dashed #339FFF;" : "border: 2px dashed #ccc;")+("margin: .5rem; font-size: 1.1rem")}>{calendars[id]}</button>
            {/each}
            </span><br><br>
            <span style="margin-bottom: .5rem; flex-wrap: wrap; gap:.5rem;display: flex;">
            <button on:click={() => {overlaySelector="rename"}}>Rename</button>
            <button on:click={() => {overlaySelector="delete"}}>Delete</button>
            <button on:click={() => {overlaySelector="new"}}>New</button>
            </span>
            <button on:click={() => {menu=!menu}}>Back</button>
          </div>
        {/if}
        {#if overlaySelector==="rename"}
          <div class="overlay">
            <input type="text" class="login_input" bind:value={renamedCal} placeholder="Renaming {calendars[selectedCalendar]}"><br>
            <span><button on:click={() => {overlaySelector=""; renamedCal=""}}>Back</button>
            <button on:click={renameCalendar}>Confirm</button></span>
            {#if errormsg!=""}
            <p>{errormsg}</p>
            {/if}
          </div>
        {/if}
        {#if overlaySelector==="delete"}
          <div class="overlay">
            <h3 style="margin-bottom: 0;">Delete {calendars[selectedCalendar]}?</h3>
            <p><i>This action cannot be undone.</i></p><br><br>
            <input type="password" class="login_input" bind:value={password} placeholder="Re-enter Password"><br>
            <span><button on:click={() => {overlaySelector=""; password=""; errormsg=""}}>Back</button>
            <button on:click={deleteCalendar}>Confirm</button></span>
            {#if errormsg!=""}
            <p>{errormsg}</p>
            {/if}
          </div>
        {/if}
        {#if overlaySelector==="new"}
          <div class="overlay">
            <input type="text" class="login_input" bind:value={newCal} placeholder="New Calendar"><br>
            <span><button on:click={() => {overlaySelector=""; newCal=""; errormsg=""}}>Back</button>
            <button on:click={newCalendar}>Confirm</button></span>
            {#if errormsg!=""}
            <p>{errormsg}</p>
            {/if}
          </div>
        {/if}
        <button on:click={invertColors}
        style:background-color={invert ? 'hsl(0, 70%, 65%)' : 'hsl(120, 70%, 65%)'}>
          Invert
        </button>
      </div>
      {/if}
      {#if hint}
        <div class="overlay">
          <div style="width: 65%; text-align:left">
            Welcome! <br><br>
            <span>Click on the <b>top half</b> of the current date to log an entry for today. Click on the <b>bottom half</b> to log an entry for tonight. You can save a rating (0-10) and, optionally, some text. Entries may be edited only on the current date.
            <br><br>To make a new calendar, click on <b>[current calendar]</b> in the bottom-left corner. You may add, delete, rename, and toggle between calendars to your liking. To reverse the red-green color scheme, click <b>Invert.</b> Your preferences will be saved for the next time you login!</span>
          </div>
          <br><br>
          <button on:click={() => {hint=!hint}}>Return</button>
        </div>
      {/if}
    </div>
  </div>
{/if}