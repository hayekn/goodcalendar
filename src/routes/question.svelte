<style>
  .title{
    font-size: clamp(30px, 2vw, 3vw);
    margin-top: 2rem;
    margin-bottom: 0;
  }
</style>
<script>
  import { db } from "../firebase.js";
  import { doc, setDoc, getDoc } from "firebase/firestore";
  import { onMount } from "svelte";
  import sparkles from "$lib/sparkles.gif";
  import { fade } from 'svelte/transition';
  import {cubicIn, cubicOut} from 'svelte/easing';
  import { encryptObject } from '$lib/encryption.js';


  export let user;
  export let externalEntry = null;
  export let onSaved = () => {};
  export let invert;
  export let selectedCalendar;

  let currentDate =  new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  function pad(n) {
    return n.toString().padStart(2, '0');
  }


  let uid = user.uid;
  if (user.email) {
    const base = user.email.split("@")[0];
    name = base.charAt(0).toUpperCase() + base.slice(1);
  } else {
    name = "Temp";
  }


  let key = `${year}-${pad(month+1)}-${pad(day)}`;
  let value = 5;
  let text = "";
  let period = ""
  let locked = false;
  let showGif = "";
  let saved = false;
  let sliderColor = "";
  let checkBackTomorrow = "";
  let override = false;

  function valueToColor(value) {
    if (invert) value = 10-value;
    const hue = 120 * (value / 10);
    return `hsl(${hue}, 70%, var(--V-brightness))`;
  }

  function getFillPercentage() {
    return value / 10;
  }

  async function save(entry) {
    if (locked && !override) return;

    if (!window.sessionEncryptionKey) {
      console.error("No encryption key available!");
      return;
    }

    saved = true;

    const ref = doc(db, "users", uid, selectedCalendar, entry.key); //prev "entries"

    let dataToSave = {};
    if (entry.period==="day"){
      dataToSave = { valueDay: value, textDay: text, timestamp: Date.now() };
    } else {
      dataToSave = { valueNight: value, textNight: text, timestamp: Date.now() };
    }
    
    // ENCRYPT TEXT FIELDS BEFORE SAVING
    const encryptedData = await encryptObject(
      dataToSave,
      ['textDay', 'textNight', 'valueDay', 'valueNight'],
      window.sessionEncryptionKey
    );
    
    await setDoc(ref, encryptedData, {merge: true});
    
    console.log("Logged " + entry.key + " at " + entry.period);


     // Check if both periods are filled
    if (entry.period==="day"){
      if (entry.filledNight){
        checkBackTomorrow = "Come back tomorrow!"
      }
    } else {
      if (entry.filledDay){
        checkBackTomorrow = "Come back tomorrow!"
      }
    }

    onSaved();
  }

  function reset() {
    saved = false;
  }

  $: if (externalEntry) {
    let filled = (externalEntry.period==="day" && externalEntry.filledDay) ||
                 (externalEntry.period==="night" && externalEntry.filledNight)
    if (!externalEntry.current && filled) {
      // past day, filled
      locked = true;
    } else if (!externalEntry.current && !filled) {
      // past day, empty
      locked = true;
    } else if (externalEntry.current) {
      // today
      locked = false;
      
      text = (externalEntry.period==="day" ? externalEntry.textDay : externalEntry.textNight)
      value = (externalEntry.period==="day" ? externalEntry.valueDay : externalEntry.valueNight) || 5
    }
    
  }

  $: if (invert) {showGif = value <= 0 ? "celebrate" : "";}
    else {showGif = value >= 10 ? "celebrate" : "";}
  $: if (invert || value) sliderColor = valueToColor(value);
</script>


<!-- wait till external entry is loaded from calendar, then show -->
{#if externalEntry}
{#if saved}
  <div class="overlay">
    {#if (externalEntry.period==="day" && !externalEntry.filledNight)}
    <h3>Entry logged!</h3>
    {:else if (externalEntry.period==="night" && !externalEntry.filledDay)}
    <h3 style="margin: 0px;">Entry logged!</h3>
    <h4>You can still log your day.</h4>
    {:else}
    <h3 style="margin: 0px;">Entry logged!</h3>
    <h4>Come back tomorrow!</h4>
    {/if}
    <button onclick={reset}>Return</button>
  </div>
{:else}
  <div class="parent">
  <h1 class="title" >Welcome {name}!</h1>
  {#if locked && !override}
      <h3 style="margin-top: 0; font-style: italic;">{checkBackTomorrow || "Viewing past entries"}</h3>
  {:else}
      <h3 style="margin-top: 0; font-style: italic;">Rate your {externalEntry.period==="day" ? "day" : "night"}</h3>
      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        bind:value={value}
        disabled={locked && !override}
        class={showGif}
        style="--fill-percentage: {getFillPercentage()}%; --slider-color: {sliderColor}; margin-bottom: 0"
      in:fade={{delay:0, duration:100, easing: cubicIn}}
      out:fade={{delay:0, duration:100, easing: cubicOut}}/>
      <textarea bind:value={text} placeholder="Optional notes..." style="margin-top:0"
      in:fade={{delay:0, duration:100, easing: cubicIn}}
      out:fade={{delay:0, duration:100, easing: cubicOut}}></textarea>
      <button onclick={() => save(externalEntry)} disabled={locked && !override}
      in:fade={{delay:0, duration:100, easing: cubicIn}}
      out:fade={{delay:0, duration:100, easing: cubicOut}}>Save ({parseFloat(value).toFixed(1)}/10)</button>
  {/if}
  </div>
{/if}
{/if}

<button class="floating-button" style="opacity: 0; left: 2%;"
ondblclick={() => {console.log("Activated override!"); override=!override}}></button>

<!-- <button  class="floating-button" style="right: 5px; background-color: rgb(0, 0, 0, 0)" onclick={darkMode}> -->
<!-- <svg xmlns="http://www.w3.org/2000/svg" height="3vh" width="3vh" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/></svg></button> -->


