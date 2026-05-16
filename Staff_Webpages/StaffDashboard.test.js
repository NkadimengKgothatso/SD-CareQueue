beforeEach(() => {
  document.body.innerHTML = `
    <section class="appointments"></section>

    <section id="totalToday"></section>
    <section id="inQueue"></section>
    <section id="completed"></section>
    <section id="avgWait"></section>

    <section id="clinicAndTime"></section>

    <section class="name-Surname"></section>

    <section id="staffName"></section>
    <section id="staffEmail"></section>
    <section id="staffAvatar"></section>
  `;

  global.alert = jest.fn();
});

test("appointments container exists", () => {
  expect(document.querySelector(".appointments"))
    .not.toBeNull();
});

test("stats elements exist", () => {
  expect(document.getElementById("totalToday"))
    .not.toBeNull();

  expect(document.getElementById("inQueue"))
    .not.toBeNull();

  expect(document.getElementById("completed"))
    .not.toBeNull();

  expect(document.getElementById("avgWait"))
    .not.toBeNull();
});

test("staff sidebar elements exist", () => {
  expect(document.getElementById("staffName"))
    .not.toBeNull();

  expect(document.getElementById("staffEmail"))
    .not.toBeNull();

  expect(document.getElementById("staffAvatar"))
    .not.toBeNull();
});

test("name-Surname element exists", () => {
  expect(document.querySelector(".name-Surname"))
    .not.toBeNull();
});

test("clinicAndTime element exists", () => {
  expect(document.getElementById("clinicAndTime"))
    .not.toBeNull();
});