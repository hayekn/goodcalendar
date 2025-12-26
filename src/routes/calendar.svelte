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
  export let selectedCalendar;

  let uid = user.uid;
  let entries = [];
  let selectedInfo = null;
  let currentDate = new Date();
  let currentMonthLabel = "";
  let showGif = "";

  function valueToColor(value) {
    if (value == null) return "var(--V-background-white)";
    const hue = 120 * (value / 10);
    return `hsl(${hue}, 70%, var(--V-brightness))`;
  }

  function pad(n) {
    return n.toString().padStart(2, "0");
  }

  async function loadEntries() {
    console.log("Loaded calendar entries");
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const currentHour = new Date().getHours();
    const defaultPeriod = currentHour < 16 ? "day" : "night";
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    currentMonthLabel = currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const colRef = collection(db, "users", uid, selectedCalendar); //prev "entries"
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
      const current = (year === today.getFullYear() &&
                      month === today.getMonth() &&
                      day === today.getDate())

      const loadedEntry = {
        key,
        day,
        filledDay: entry?.valueDay != null,
        filledNight: entry?.valueNight != null,
        valueDay: entry?.valueDay ?? null,
        valueNight: entry?.valueNight ?? null,
        textDay: entry?.textDay ?? null,
        textNight: entry?.textNight ?? null,
        current: current
      }

      // when init, select current day
      if (current){
          if (selectedInfo?.period)
            loadedEntry.period = selectedInfo.period
          else
            loadedEntry.period = defaultPeriod;
          handleClick(loadedEntry);
      }

      temp.push(loadedEntry);
    }

    entries = temp;
  }

  function handleClick(entry) {
    selectedInfo = entry;
    onSelectEntry(entry);
    console.log("Selected "+selectedInfo.key+" at "+selectedInfo.period)
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
  $: if (selectedCalendar) {loadEntries(); selectedInfo = null}

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
        style={(e.current ? "border: 1.5px solid var(--V-lighter-text);" : "")+
              (
              (selectedInfo != null && selectedInfo.key===e.key && selectedInfo.period === "day") 
              ? "border-top: 2.5px solid #6BCBFF;" : selectedInfo != null && selectedInfo.key===e.key 
              ? "border-bottom: 2.5px solid #0077BA;" : ""
              )
              }
      >

        <div class="day-number">{e.day}</div>

        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="day-half top-half"
          style={
          ( (e.valueDay != null) ?
            (!invert && e.valueDay==10)
            ? `background: url('${sparkles}'); background-size: cover;`
            : (invert && e.valueDay==0) ? `background: url('${sparkles}'); background-size: cover;`
            : `background-color: ${valueToColor((e.valueDay!=null && !invert) ? e.valueDay : 
            (e.valueDay != null) ? 10 - e.valueDay : null )};`
            : ''
          ) +
            'transition: background-color .3s ease-in-out'
          }
          on:click={() => handleClick({ ...e, period: 'day'})}
        ></div>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="day-half bottom-half"
          style={
          ( (e.valueNight != null) ?
            (!invert && e.valueNight==10)
            ? `background: url('${sparkles}'); background-size: cover;`
            : (invert && e.valueNight==0) ? `background: url('${sparkles}'); background-size: cover;`
            : `background-color: ${valueToColor((e.valueNight!=null && !invert) ? e.valueNight : 
            (e.valueNight != null) ? 10 - e.valueNight : null )};`
            : ''
          ) +
            'transition: background-color .3s ease-in-out'
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