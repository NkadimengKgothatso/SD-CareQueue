beforeEach(() => {
  document.body.innerHTML = `
    <div id="emptyStates"></div>
    <div id="filledStates"></div>
    <div id="patientAvatar"></div>

    <div id="queueCount"></div>
    <div id="queueProgressText"></div>
    <div id="progressPercent"></div>
    <progress id="queueMeter"></progress>
    <div id="queuePosition"></div>
    <div id="waitTime"></div>

    <div id="visitsCount"></div>

    <aside>
      <nav>
        <ul>
          <li><a href="PatientDashboard.html"></a></li>
        </ul>
      </nav>
    </aside>
  `;
});

test("setAvatarInitial uses name initials", async () => {
  const { setAvatarInitial } = await import("./PatientDashboard.js");

  setAvatarInitial("John Doe", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent).toBe("JD");
});

test("setAvatarInitial falls back to email", async () => {
  const { setAvatarInitial } = await import("./PatientDashboard.js");

  setAvatarInitial("", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent).toBe("J");
});

test("queue meter exists", () => {
  expect(document.getElementById("queueMeter")).not.toBeNull();
});