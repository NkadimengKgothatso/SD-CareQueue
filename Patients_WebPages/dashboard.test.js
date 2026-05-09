beforeEach(() => {
  document.body.innerHTML = `
    <section id="emptyStates"></section>
    <section id="filledStates"></section>

    <section id="patientAvatar"></section>

    <section id="queueCount"></section>
    <section id="queueProgressText"></section>
    <section id="progressPercent"></section>
    <progress id="queueMeter"></progress>
    <section id="queuePosition"></section>
    <section id="waitTime"></section>

    <section id="visitsCount"></section>

    <aside>
      <nav>
        <ul>
          <li><a href="Dashboard.html"></a></li>
        </ul>
      </nav>
    </aside>
  `;
});

test("showEmpty displays empty state", async () => {
  const module = await import("./Dashboard.js");

  module.showEmpty();

  expect(document.getElementById("emptyStates").style.display)
    .toBe("block");

  expect(document.getElementById("filledStates").style.display)
    .toBe("none");
});

test("showFilled displays filled state", async () => {
  const module = await import("./Dashboard.js");

  module.showFilled();

  expect(document.getElementById("emptyStates").style.display)
    .toBe("none");

  expect(document.getElementById("filledStates").style.display)
    .toBe("block");
});

test("setAvatarInitial uses name initials", async () => {
  const { setAvatarInitial } = await import("./Dashboard.js");

  setAvatarInitial("John Doe", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent)
    .toBe("JD");
});

test("setAvatarInitial falls back to email", async () => {
  const { setAvatarInitial } = await import("./Dashboard.js");

  setAvatarInitial("", "john@test.com");

  expect(document.getElementById("patientAvatar").textContent)
    .toBe("J");
});

test("queue meter exists", () => {
  expect(document.getElementById("queueMeter"))
    .not.toBeNull();
});