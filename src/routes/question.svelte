<script>
  import { db } from "../firebase.js";
  import { doc, setDoc, getDoc } from "firebase/firestore";
  import { onMount } from "svelte";
  import sparkles from "$lib/sparkles.gif";

  export let user;
  export let externalEntry = null;
  export let onSaved = () => {};
  export let invert;


  let currentDate =  new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  function pad(n) {
    return n.toString().padStart(2, '0');
  }


  let uid = user.uid;
  if (user.email){
    name = user.email.replace("@tracker.app", "").charAt(0).toUpperCase()+
           user.email.replace("@tracker.app", "").slice(1);
  } else {
    name = "Temp"
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


  const currentHour = new Date().getHours();
  let defaultPeriod = currentHour < 12 ? "day" : "night";
  $: if (!externalEntry) {
  externalEntry = {
    key,
    period: defaultPeriod,
    current: true,
    filledDay: false,
    filledNight: false,
  };
  } 

  function valueToColor(value) {
    if (invert){
      value = 10-value
    }
    const hue = 120 * (value / 10);
    return `hsl(${hue}, 70%, 65%)`;
  }

  function getFillPercentage() {
    return value / 10;
  }

  async function checkToday() {
    const ref = doc(db, "users", uid, "entries", key);
    const entry = await getDoc(ref);
    console.log(entry.data())
    if (entry.exists() && entry.data().valueDay && entry.data().valueNight) {
      locked = true;
      checkBackTomorrow = "Check again tomorrow"
    }
  }

  async function save(period) {
    if (locked) return;
    saved = true;
    locked = true;

    const ref = doc(db, "users", uid, "entries", key);

    if (period==="day"){
      await setDoc(ref, { valueDay:value, textDay:text, timestamp:Date.now() }, {merge: true});
      if (externalEntry.filledNight){
        checkBackTomorrow = "Check again tomorrow"
      }
    } else {
      await setDoc(ref, {  valueNight:value, textNight:text, timestamp:Date.now() }, {merge: true});
      if (externalEntry.filledDay){
        checkBackTomorrow = "Check again tomorrow"
      }
    }

    value = 5;
    text = "";
    onSaved();
  }

  function reset() {
    saved = false;
  }

  onMount(checkToday);

  $: if (externalEntry) {
    let filled = (externalEntry.period==="day" && externalEntry.filledDay) ||
                 (externalEntry.period==="night" && externalEntry.filledNight)
    if (!externalEntry.current && filled) {
      // Past day, filled
      locked = true;
    } else if (!externalEntry.current && !filled) {
      // Past day, empty
      locked = true;
    } else if (externalEntry.current && filled) {
      // Today, already filled
      locked = true;
    } else if (externalEntry.current && !filled) {
      // Today, not yet filled
      locked = false;
    }
  }

  $: if (invert) {showGif = value <= 0 ? "celebrate" : "none";}
    else {showGif = value >= 10 ? "celebrate" : "none";}
  $: if (invert || value) sliderColor = valueToColor(value);
</script>

{#if saved}
  <div class="overlay">
    {#if (externalEntry.period==="day" && !externalEntry.filledNight)}
    <h3>Entry logged!</h3>
    {:else if (externalEntry.period==="night" && !externalEntry.filledDay)}
    <h3 style="margin: 0px;">Entry logged!</h3>
    <h4>You can still log your day.</h4>
    {:else}
    <h3 style="margin: 0px;">Entry logged!</h3>
    <h4>Check again tomorrow.</h4>
    {/if}
    <button on:click={reset}>Return</button>
  </div>
{:else}
  {#if locked}
  <br>
    <div class="question">
      <h2 style="background: url({sparkles}); no-repeat; background-size: cover; 
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0px">Welcome {name}!</h2>
      <h3 style="margin-top: .25rem; font-style: italic;">{checkBackTomorrow || "Viewing past entries"}</h3>
    </div>
  {:else}
    <div class="question">
      <h2 style="background: url({sparkles}); no-repeat; background-size: cover; 
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0px">
      Welcome {name}!</h2>
      <h3 style="margin-top: .25rem; font-style: italic;">Rate your {externalEntry.period==="day" ? "day" : "night"}</h3>
      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        bind:value={value}
        disabled={locked}
        class={showGif}
        style="--fill-percentage: {getFillPercentage()}%; --slider-color: {sliderColor}"
      />
      <textarea bind:value={text} placeholder="Optional notes..."></textarea><br>
      <button on:click={() => save(externalEntry.period)} disabled={locked}>Save ({value.toFixed(1)}/10)</button>
    </div>
  {/if}
{/if}

<style>
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fefefe;
  text-align: center;
  z-index: 100;
}
.overlay h2 {
  margin-bottom: 1rem;
}
</style>
