<script>
  import { db } from "../firebase.js";
  import { collection, getDocs } from "firebase/firestore";
  import { onMount } from "svelte";
  import sparkles from "$lib/sparkles.gif";
  import "../app.css";

  export let user;
  export let onSelectEntry = (entry) => {};
  export let reloadTrigger = 0;
  export let invert;

  let uid = user.uid;
  let entries = [];
  let selectedInfo = null;
  let currentDate = new Date();
  let currentMonthLabel = "";

  function valueToColor(value) {
    if (value == null) return "#fff";
    if (invert){
      value = 10-value
    }
    const hue = 120 * (value / 10);
    return `hsl(${hue}, 70%, 65%)`;
  }

  function pad(n) {
    return n.toString().padStart(2, '0');
  }


  async function loadEntries() {
    console.log("loaded entries")
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    currentMonthLabel = currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric"
    });

    const colRef = collection(db, "users", uid, "entries");
    const snap = await getDocs(colRef);
    const data = {};
    snap.forEach(docSnap => {
      data[docSnap.id] = docSnap.data();
    });

    const temp = [];
    const showTo =
      year === today.getFullYear() && month === today.getMonth()
        ? today.getDate()
        : daysInMonth;

    for (let day = 1; day <= showTo; day++) {
      const key = `${year}-${pad(month+1)}-${pad(day)}`;
      const entry = data[key];
      temp.push({
        key,
        day,
        filled: !!entry,
        value: entry?.value ?? null,
        text: entry?.text ?? null,
        current: year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
      });
    }

    entries = temp;
  }

  function handleClick(entry) {
    selectedInfo = entry;
    onSelectEntry(selectedInfo);
  }

  function prevMonth() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    currentDate = d;
    loadEntries();
    selectedInfo = null;
  }

  function nextMonth() {
    const today = new Date();
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    if (next.getFullYear() > today.getFullYear() || (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())) {
      return;
    }
    currentDate = next;
    loadEntries();
    selectedInfo = null;
  }

  $: if (reloadTrigger) loadEntries();
  onMount(loadEntries);
</script>

<div class="month-nav" style="display:flex; align-items:center; justify-content:center; gap:1rem; margin-top:5rem;">
  <button class="nav-btn" on:click={prevMonth} aria-label="Previous month">←</button>
  <p style="margin: 0; font-size: 1.2rem">{currentMonthLabel}</p>
  <button
    class="nav-btn"
    on:click={nextMonth}
    aria-label="Next month"
    disabled={
      currentDate.getFullYear() === new Date().getFullYear() &&
      currentDate.getMonth() === new Date().getMonth()
    }
  >
    →
  </button>
</div>

<div class="calendar" style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; max-width:350px; margin:1rem auto 2rem auto;">
  {#each entries as e}
    <div
      class="day"
      style={
        (e.value >= 10
          ? `background: url('${sparkles}'); background-size: cover;`
          : `background-color: ${valueToColor(e.value)};`) +
        (e.current ? ' border: 1.5px solid #333;' : '')
      }
      on:click={() => handleClick(e)}    >
      {e.day}
    </div>
  {/each}
</div>

{#if selectedInfo}
  <div
    class="entry-info"
    style="max-width:350px; margin:0rem auto; padding:0.5rem; background:#f0f0f0; border-radius:6px; text-align:center; font-size:0.9rem;"
  >
    <strong>
      {new Date(new Date(selectedInfo.key).setHours(24,0,0,0)).toLocaleDateString("default",
       {month: "short",
        day: "numeric"}
      )}
    </strong>
    {#if selectedInfo.value}
      — {selectedInfo.value}/10
    {/if}<br>
    <i>{selectedInfo.text || "No Entry"}</i>
  </div>
{/if}

<style>
  .nav-btn {
    border: none;
    background: #eee;
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    font-size: 1rem;
  }
  .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .day {
    border: 1px solid #ccc;
    border-radius: 6px;
    height: 50px;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    transition: all .12s ease;
  }
  .day:hover { transform:translateY(-.2rem); background: #f0f0f0; }

  .entry-info { /* inline styles above, keep here if you want to tweak */ }
</style>
