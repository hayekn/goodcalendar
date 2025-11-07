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
    name = user.email.replace("@tracker.app", "");
  } else {
    name = "Temp"
  }

  // key for today's date (YYYY-MM-DD)
  let key = `${year}-${pad(month+1)}-${pad(day)}`;

  let value = 5;
  let text = "";
  let locked = false;
  let showGif = "";
  let saved = false;
  let sliderColor = "";

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
    if (entry.exists()) {
      locked = true;
    }
  }

  async function save() {
    if (locked) return;
    saved = true;
    locked = true;

    const ref = doc(db, "users", uid, "entries", key);
    await setDoc(ref, { value, text, timestamp: Date.now() });

    if (externalEntry) {
      externalEntry.filled = true;
      externalEntry.value = value;
      externalEntry.text = text;
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
    // const today = new Date().toISOString().split("T")[0];

    if (!externalEntry.current && externalEntry.filled) {
      // Past day, filled
      locked = true;
    } else if (!externalEntry.current && !externalEntry.filled) {
      // Past day, empty
      locked = true;
    } else if (externalEntry.current && externalEntry.filled) {
      // Today, already filled
      locked = true;
    } else if (externalEntry.current && !externalEntry.filled) {
      // Today, not yet filled
      locked = false;
      key = externalEntry.key;
    }
  }

  $: if (invert) {showGif = value <= 0 ? "celebrate" : "none";}
    else {showGif = value >= 10 ? "celebrate" : "none";}
  $: if (invert || value) sliderColor = valueToColor(value);
</script>

{#if saved}
  <div class="overlay">
    <h2>Come back tomorrow!</h2>
    <button on:click={reset}>Return</button>
  </div>
{:else}
  {#if locked}
  <br>
    <div class="question">
      <h3 style="margin: 0px;">Welcome {name}! Viewing past entries.</h3>
    </div>
  {:else}
    <div class="question">
      <h3>Welcome {name}! Rate Your Day:</h3>
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
      <button on:click={save} disabled={locked}>Save ({value.toFixed(1)}/10)</button>
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
