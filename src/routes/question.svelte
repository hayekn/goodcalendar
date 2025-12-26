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
    saved = true;

    const ref = doc(db, "users", uid, selectedCalendar, entry.key); //prev "entries"
    if (entry.period==="day"){
      await setDoc(ref, { valueDay:value, textDay:text, timestamp:Date.now() }, {merge: true});
      if (entry.filledNight){
        checkBackTomorrow = "Come back tomorrow!"
      }
    } else {
      await setDoc(ref, {  valueNight:value, textNight:text, timestamp:Date.now() }, {merge: true});
      if (entry.filledDay){
        checkBackTomorrow = "Come back tomorrow!"
      }
    }
    console.log("Logged " +entry.key+" at "+entry.period)

    // value = 5;
    // text = "";

    // signals change to calendar via main page
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
  {#if locked && !override}
  <br>
    <div class="parent">
      <h1 class="title" >Welcome {name}!</h1>
      <h3 style="margin-top: 0; font-style: italic;">{checkBackTomorrow || "Viewing past entries"}</h3>
    </div>
  {:else}
    <div class="parent">
      <h1 class="title" >Welcome {name}!</h1>
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
      />
      <textarea bind:value={text} placeholder="Optional notes..." style="margin-top:0"></textarea>
      <button onclick={() => save(externalEntry)} disabled={locked && !override}>Save ({value.toFixed(1)}/10)</button>
    </div>
  {/if}
{/if}
{/if}

<button class="floating-button" style="opacity: 0; left: 2%;"
ondblclick={() => {console.log("Activated override!"); override=!override}}></button>

<!-- <button  class="floating-button" style="right: 5px; background-color: rgb(0, 0, 0, 0)" onclick={darkMode}> -->
<!-- <svg xmlns="http://www.w3.org/2000/svg" height="3vh" width="3vh" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/></svg></button> -->


