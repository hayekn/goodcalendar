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
  let showGif = "";

  function valueToColor(value) {
    if (value == null) return "#fff";
    const hue = 120 * (value / 10);
    return `hsl(${hue}, 70%, 65%)`;
  }

  function pad(n) {
    return n.toString().padStart(2, "0");
  }

  async function loadEntries() {
    console.log("Loaded calendar entries");
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    currentMonthLabel = currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const colRef = collection(db, "users", uid, "entries");
    const snap = await getDocs(colRef);
    const data = {};
    snap.forEach((docSnap) => {
      data[docSnap.id] = docSnap.data();
    });

    const temp = [];
    const showTo =
      year === today.getFullYear() && month === today.getMonth()
        ? today.getDate()
        : daysInMonth;

    for (let day = 1; day <= showTo; day++) {
      const key = `${year}-${pad(month + 1)}-${pad(day)}`;
      const entry = data[key];

      temp.push({
        key,
        day,
        filledDay: entry?.valueDay != null,
        filledNight: entry?.valueNight != null,
        valueDay: entry?.valueDay ?? null,
        valueNight: entry?.valueNight ?? null,
        textDay: entry?.textDay ?? null,
        textNight: entry?.textNight ?? null,
        current:
          year === today.getFullYear() &&
          month === today.getMonth() &&
          day === today.getDate(),
      });
    }

    entries = temp;
  }

  function handleClick(entry) {
    selectedInfo = entry;
    onSelectEntry(entry);
    console.log("Selected "+entry.key)
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
    if (
      next.getFullYear() > today.getFullYear() ||
      (next.getFullYear() === today.getFullYear() &&
        next.getMonth() > today.getMonth())
    ) {
      return;
    }
    currentDate = next;
    loadEntries();
    selectedInfo = null;
  }

  $: if (reloadTrigger) loadEntries();
  // $: if (invert) {showGif = ""(e.valueDay >= 10
  //         ? `background: url('${sparkles}'); background-size: cover;`
  //         : `background-color: ${valueToColor(e.valueDay)};`)""}

    // else {showGif = e.valueNight >= 10 ? "background: url('${sparkles}'); background-size: cover;" : 
    // "background-color: ${valueToColor(e.valueDay)};";}

  // $: if (invert || value) sliderColor = valueToColor(value);
  onMount(loadEntries);
</script>

<div class="month-nav">
  <button class="nav-btn" on:click={prevMonth} aria-label="Previous month">
    ←
  </button>
  <p>{currentMonthLabel}</p>
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

<div class="calendar">
  {#each entries as e}
    <div
      class="day"
      style={e.current ? "border: 1.5px solid #333;" : ""}
    >
      <div class="day-number">{e.day}</div>

      <div
        class="day-half top-half"
        style={
        ((!invert && e.valueDay==10)
          ? `background: url('${sparkles}'); background-size: cover;`
          : (invert && e.valueDay==0) ? `background: url('${sparkles}'); background-size: cover;`
          : `background-color: ${valueToColor((e.valueDay!=null && !invert) ? e.valueDay : 
          (e.valueDay != null) ? 10 - e.valueDay : null )};`)
        }
        on:click={() => handleClick({ ...e, period: 'day' })}
      ></div>
      <div
        class="day-half bottom-half"
        style={
        ((!invert && e.valueNight==10)
          ? `background: url('${sparkles}'); background-size: cover;`
          : (invert && e.valueNight==0) ? `background: url('${sparkles}'); background-size: cover;`
          : `background-color: ${valueToColor((e.valueNight!=null && !invert) ? e.valueNight : 
          (e.valueNight != null) ? 10 - e.valueNight : null )};`)
        }
        on:click={() => handleClick({ ...e, period: 'night' })}
      ></div>
    </div>
  {/each}
</div>
<!-- (e.valueNight!=null && !invert) ? e.valueNight : e.valueNight ? 10 - e.valueNight : null -->
{#if selectedInfo && 
!((selectedInfo.period==="day" && !selectedInfo.filledDay && selectedInfo.current) ||
(selectedInfo.period==="night" && !selectedInfo.filledNight && selectedInfo.current))
}
  <div class="entry-info">
    <strong>
      {new Date(new Date(selectedInfo.key).setHours(24,0,0,0)).toLocaleDateString("default", 
      {month: "short", day: "numeric"} 
      )} {selectedInfo.period === "day" ? "Day" : "Night"}
    </strong>
    {#if selectedInfo.period === "day"}
        {#if selectedInfo.filledDay}
          — {selectedInfo.valueDay}/10
        {/if} <br>
          <i>{selectedInfo.textDay || "No Entry"}</i>
    {:else}
        {#if selectedInfo.filledNight}
          — {selectedInfo.valueNight}/10
        {/if} <br>
      <i>{selectedInfo.textNight || "No Entry"}</i>
    {/if}
  </div>
{/if}

<style>
  .month-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 5rem;
  }

  .nav-btn {
    border: none;
    background: #eee;
    border-radius: 6px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    font-size: 1rem;
  }
  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    max-width: 350px;
    margin: 1rem auto 2rem auto;
  }

  .day {
    position: relative;
    border: 1px solid #ccc;
    border-radius: 6px;
    height: 50px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.12s ease;
    display: flex;
    flex-direction: column;
  }

  .day:hover {
    transform: translateY(-0.2rem);
  }

  .day-number {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
    z-index: 2;
    pointer-events: none;
  }

  .day-half {
    flex: 1;
    width: 100%;
  }

  .top-half {
    border-bottom: .75px dashed rgba(0, 0, 0, 0.15);
  }

  .entry-info {
    max-width: 350px;
    margin: 0 auto;
    margin-bottom: 2rem;
    padding: 0.5rem;
    background: #f0f0f0;
    border-radius: 6px;
    text-align: center;
    font-size: 0.9rem;
  }
</style>
