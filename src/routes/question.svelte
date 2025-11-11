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
  let override = false; 


  function valueToColor(value) {
    if (invert) value = 10-value;
    const hue = 120 * (value / 10);
    return `hsl(${hue}, 70%, 65%)`;
  }

  function getFillPercentage() {
    return value / 10;
  }

  async function save(entry) {
    if (locked && !override) return;
    saved = true;

    const ref = doc(db, "users", uid, "entries", entry.key);
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

    value = 5;
    text = "";

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
        disabled={locked && !override}
        class={showGif}
        style="--fill-percentage: {getFillPercentage()}%; --slider-color: {sliderColor}"
      />
      <textarea bind:value={text} placeholder="Optional notes..."></textarea><br>
      <button onclick={() => save(externalEntry)} disabled={locked && !override}>Save ({value.toFixed(1)}/10)</button>
    </div>
  {/if}
{/if}
{/if}

<button class="hiddencheck" ondblclick={() => {console.log("Activated override!"); override=!override}}></button>

<style>
.hiddencheck {
  opacity: 0;
  right: 2%;
  top: 2%;
  position: absolute;
}
</style>
