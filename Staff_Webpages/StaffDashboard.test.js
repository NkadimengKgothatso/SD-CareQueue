beforeEach(() => {
  document.body.innerHTML = `
    <div class="appointments"></div>

    <div id="totalToday"></div>
    <div id="inQueue"></div>
    <div id="completed"></div>
    <div id="avgWait"></div>

    <div id="clinicAndTime"></div>

    <div class="name-Surname"></div>

    <div id="staffName"></div>
    <div id="staffEmail"></div>
    <div id="staffAvatar"></div>
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