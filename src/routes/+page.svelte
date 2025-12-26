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
  let darkModeOn = false; 

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

  function darkMode() {
    darkModeOn = !darkModeOn;
    if (darkModeOn){
      document.documentElement.style.setProperty('--V-background-white', 'var(--background-black)');
      document.documentElement.style.setProperty('--V-background-off-white', 'var(--background-off-black)');
      document.documentElement.style.setProperty('--V-medium-text', 'var(--lighter-text)');
      document.documentElement.style.setProperty('--V-dark-text', 'var(--lighter-text)');
      document.documentElement.style.setProperty('--V-ligher-text', 'var(--dark-text)');
      document.documentElement.style.setProperty('--V-brightness', '50%');
      document.documentElement.style.setProperty('--V-brightness-factor', '2.2');
      document.documentElement.style.setProperty('--V-true-white', 'var(--true-black)');
    }
    else {
      document.documentElement.style.setProperty('--V-background-white', 'var(--background-white)');
      document.documentElement.style.setProperty('--V-background-off-white', 'var(--background-off-white)');
      document.documentElement.style.setProperty('--V-medium-text', 'var(--medium-text)');
      document.documentElement.style.setProperty('--V-dark-text', 'var(--dark-text)');
      document.documentElement.style.setProperty('--V-ligher-text', 'var(--lighter-text)');
      document.documentElement.style.setProperty('--V-brightness', 'var(--brightness)');
      document.documentElement.style.setProperty('--V-brightness-factor', 'var(--brightness-factor)');
      document.documentElement.style.setProperty('--V-true-white', 'var(--true-white)');
    }
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
        calendars = { ...calendars };
        selectedCalendar = Object.keys(calendars).sort()[0];

        updateCalendars();

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
      selectedCalendar = timestamp;
      updateCalendars();

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
        calendars[timestamp] = "Main";
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
      calendars[timestamp] = "Main";
      selectedCalendar = timestamp;
      await updateCalendars();

      console.log("New user.");
    }
}

// $: if (darkModeLogin) {darkMode}
</script>

{#if !user || !selectedCalendar}
  <Login darkMode={darkMode}/>
{:else}

<div style="flex-grow: 1;">
  <Question user={user} externalEntry={selectedEntry} onSaved={handleSaved} invert={invert} selectedCalendar={selectedCalendar}/>
  <Calendar user={user} onSelectEntry={handleSelectEntry} reloadTrigger={reloadCounter} invert={invert} selectedCalendar={selectedCalendar}/>

  <div style="display: flex;
  justify-content: space-between;
  gap: .5rem;
  flex-wrap: wrap;
  padding-left: 5%;
  padding-right: 5%;">
    <div style="order: 2; flex-wrap: wrap; gap:.5rem; display: flex;">
      <span>
        <button on:click={() => {hint = !hint}} style="background-color: rgb(0, 0, 0, 0); margin: 0; padding: 0px 10px">
          <svg height="25px" viewBox="0 0 352 512"><path fill="var(--V-medium-text)" d="M96.06 454.35c.01 6.29 1.87 12.45 5.36 17.69l17.09 25.69a31.99 31.99 0 0 0 26.64 14.28h61.71a31.99 31.99 0 0 0 26.64-14.28l17.09-25.69a31.989 31.989 0 0 0 5.36-17.69l.04-38.35H96.01l.05 38.35zM0 176c0 44.37 16.45 84.85 43.56 115.78 16.52 18.85 42.36 58.23 52.21 91.45.04.26.07.52.11.78h160.24c.04-.26.07-.51.11-.78 9.85-33.22 35.69-72.6 52.21-91.45C335.55 260.85 352 220.37 352 176 352 78.61 272.91-.3 175.45 0 73.44.31 0 82.97 0 176zm176-80c-44.11 0-80 35.89-80 80 0 8.84-7.16 16-16 16s-16-7.16-16-16c0-61.76 50.24-112 112-112 8.84 0 16 7.16 16 16s-7.16 16-16 16z"/></svg>
        </button>
        <button style="background-color: rgb(0, 0, 0, 0); margin: 0; padding: 0px 10px" on:click={darkMode}>
        <svg height="25px" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/></svg></button>
        <button on:click={logout} style="background-color: rgb(0, 0, 0, 0); margin: 0; padding: 0px 8px">
        <svg height="25px" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M497 273L329 441c-15 15-41 4.5-41-17v-96H152c-13.3 0-24-10.7-24-24v-96c0-13.3 10.7-24 24-24h136V88c0-21.4 25.9-32 41-17l168 168c9.3 9.4 9.3 24.6 0 34zM192 436v-40c0-6.6-5.4-12-12-12H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h84c6.6 0 12-5.4 12-12V76c0-6.6-5.4-12-12-12H96c-53 0-96 43-96 96v192c0 53 43 96 96 96h84c6.6 0 12-5.4 12-12z"/></svg>          </button>
      </span>
    </div>
    {#if invert!=null} 
    <div style="order: 1; flex-wrap: wrap; gap:.5rem;display: flex">
      <button on:click={() => {menu=!menu}}
      style="padding: .4rem inherit; border: 2px dashed #339FFF;">
        <b>{calendars[selectedCalendar]}</b>
      </button>
      {#if menu}
        <div class="overlay">
          <h2 style="margin-bottom: .5rem;">Your Calendars</h2>
          <span>
          {#each Object.keys(calendars).sort() as id}
            <button on:click={() => {selectedCalendar=id; updateCalendars()}}
            style={(selectedCalendar===id ? "border: 2px dashed #339FFF;" : "border: 2px dashed #ccc;")+("margin: .5rem; margin-bottom: 0; font-size: 1.1rem")}>{calendars[id]}</button>
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
      style='background-color: {invert ? 'hsl(0, 70%, var(--V-brightness))' : 'hsl(120, 70%, var(--V-brightness))'}; color: #202020; transition: background-color .2s ease-in-out'>
        Invert
      </button>
    </div>
    {/if}
    {#if hint}
      <div class="overlay">
        <div style="width: 65%; text-align:left">
          <span>Click on the <b>top half</b> of the current date to log an entry for today. Click on the <b>bottom half</b> to log an entry for tonight. You can save a rating (0-10) and, optionally, some text. Entries may be edited only on the current date.
          <br><br>To manage your calendars, click on <b>Main</b> in the bottom-left corner. You may add, delete, rename, and toggle between calendars to your liking. To reverse the red-green color scheme, click <b>Invert.</b> Your preferences will be saved for the next time you login!</span>
        </div>
        <br><br>
        <button on:click={() => {hint=!hint}}>Return</button>
      </div>
    {/if}
  </div>
</div>
  <!-- <div style="position: absolute; top:2%; right: clamp(40px, 5%, 7%); display: inline-block; align-items: center">
    <button on:click={() => {hint = !hint}} style="background-color: rgb(0, 0, 0, 0); padding: 0; margin-right: 20px">
      <svg xmlns="http://www.w3.org/2000/svg" height="3vh" viewBox="0 0 352 512"><path fill="var(--V-medium-text)" d="M96.06 454.35c.01 6.29 1.87 12.45 5.36 17.69l17.09 25.69a31.99 31.99 0 0 0 26.64 14.28h61.71a31.99 31.99 0 0 0 26.64-14.28l17.09-25.69a31.989 31.989 0 0 0 5.36-17.69l.04-38.35H96.01l.05 38.35zM0 176c0 44.37 16.45 84.85 43.56 115.78 16.52 18.85 42.36 58.23 52.21 91.45.04.26.07.52.11.78h160.24c.04-.26.07-.51.11-.78 9.85-33.22 35.69-72.6 52.21-91.45C335.55 260.85 352 220.37 352 176 352 78.61 272.91-.3 175.45 0 73.44.31 0 82.97 0 176zm176-80c-44.11 0-80 35.89-80 80 0 8.84-7.16 16-16 16s-16-7.16-16-16c0-61.76 50.24-112 112-112 8.84 0 16 7.16 16 16s-7.16 16-16 16z"/></svg>
    </button>
    <button  class="floating-button" style="background-color: rgb(0, 0, 0, 0); padding: 0" on:click={darkMode}>
      <svg xmlns="http://www.w3.org/2000/svg" height="3vh" width="3vh" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/></svg></button>
  </div> -->
{/if}