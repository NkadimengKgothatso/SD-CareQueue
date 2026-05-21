# Test Plan and Results 

## Testing Strategy
This system was tested using automated unit and integration-style tests which were written with Jest and the jsdom test environment. The objective of testing was to verify that the main user workflows work correctly across all roles of the system.

The tests mainly focused on:
<ul>
<li>Checking that each helper function returns correct values.</li>
<li>Validating form input before the data is saved.</li>
<li>Confirming that the pages render the correct information in the DOM.</li>
<li>Testing Firebase interactions using mocked Firestore and Authentication functions.</li>
<li>Checking how well the system handles errors when Firebase fails.</li>
<li>Verifying the intended behaviour of each role.</li>
<li>Testing the ML logic for wait-time.</li>
</ul>

Firebase services were mocked so that tests could run without connecting to the real database, which was initially a challenge.

The tests are stored in the `testing/` folder and can be run with `npm test` or `npm run coverage` in the terminal.

You could also run coverage for specific scripts, for example: `npm run coverage:analytics`.

## Test Environment
The testing was done using the following:
<ul>
<li><b>Test Framework:</b> Jest</li>
<li><b>Test Environment:</b> jsdom</li>
<li><b>Mocked Services:</b> Firebase Authentication, Firestore, browser APIs, fetch, geolocation, alerts, confirms, and DOM events</li>
<li><b>Test location:</b> <code>testing/</code></li>
<li><b>Application areas tested:</b> Admin pages, Staff pages, Patient pages, notifications, queues, appointments, analytics, and ML wait-time prediction</li>
</ul>

## Test Cases 

<h2>Test Cases</h2>

<table>
<tr>
<th>#</th>
<th>Test File</th>
<th>Area Tested</th>
<th>Main Test Cases</th>
</tr>

<tr>
<td>1</td>
<td><code>admin.test.js</code></td>
<td>Admin authentication and sidebar</td>
<td>
<ul>
<li>Test Firebase initialization.</li>
<li>Test admin verification for valid admin users.</li>
<li>Test that non-admin users are signed out.</li>
<li>Test behaviour when admin records are missing or invalid.</li>
<li>Test sidebar name, email, and avatar rendering.</li>
<li>Test error handling when admin lookup fails.</li>
</ul>
</td>
</tr>

<tr>
<td>2</td>
<td><code>staff.test.js</code></td>
<td>Staff management</td>
<td>
<ul>
<li>Test staff table rendering.</li>
<li>Test clinic option loading.</li>
<li>Test staff form validation.</li>
<li>Test creating a new staff member.</li>
<li>Test removing a staff member.</li>
<li>Test invite modal open and close behaviour.</li>
<li>Test toast messages and Firestore error handling.</li>
</ul>
</td>
</tr>

<tr>
<td>3</td>
<td><code>clinicManagement.test.js</code></td>
<td>Clinic management</td>
<td>
<ul>
<li>Test selecting clinic services.</li>
<li>Test rendering clinic cards.</li>
<li>Test clinic status display.</li>
<li>Test operating hours display and editing.</li>
<li>Test adding, editing, and deleting clinics.</li>
<li>Test filtering clinics by name, province, status, and service.</li>
<li>Test modal open and close behaviour.</li>
</ul>
</td>
</tr>

<tr>
<td>4</td>
<td><code>analytics.test.js</code></td>
<td>Admin analytics dashboard</td>
<td>
<ul>
<li>Test KPI calculations.</li>
<li>Test queue analytics calculations.</li>
<li>Test no-show rate calculations.</li>
<li>Test date filtering.</li>
<li>Test analytics table rendering.</li>
<li>Test clinic search filtering.</li>
<li>Test CSV and PDF export behaviour.</li>
<li>Test load failure handling.</li>
</ul>
</td>
</tr>

<tr>
<td>5</td>
<td><code>Appointments.test.js</code></td>
<td>Staff appointments</td>
<td>
<ul>
<li>Test date and time helper functions.</li>
<li>Test appointment card rendering.</li>
<li>Test appointment cancellation.</li>
<li>Test appointment rescheduling.</li>
<li>Test free slot calculation.</li>
<li>Test appointment listener rendering.</li>
<li>Test appointment filter buttons.</li>
<li>Test staff authentication bootstrap.</li>
</ul>
</td>
</tr>

<tr>
<td>6</td>
<td><code>Queues.test.js</code></td>
<td>Staff queue management</td>
<td>
<ul>
<li>Test queue card rendering.</li>
<li>Test queue status updates.</li>
<li>Test syncing appointments to queue records.</li>
<li>Test deleting old queue records.</li>
<li>Test position notification behaviour.</li>
<li>Test rendering active and completed patients.</li>
<li>Test staff clinic loading.</li>
<li>Test empty queue state.</li>
</ul>
</td>
</tr>

<tr>
<td>7</td>
<td><code>walkin.test.js</code></td>
<td>Walk-in appointments</td>
<td>
<ul>
<li>Test date and time helpers.</li>
<li>Test next available slot calculation.</li>
<li>Test staff profile lookup.</li>
<li>Test confirmation modal behaviour.</li>
<li>Test loading walk-in appointments.</li>
<li>Test adding a walk-in patient.</li>
<li>Test full-day handling.</li>
<li>Test Firestore write failure handling.</li>
</ul>
</td>
</tr>

<tr>
<td>8</td>
<td><code>Availability.test.js</code></td>
<td>Staff availability</td>
<td>
<ul>
<li>Test workday generation.</li>
<li>Test clinic hours fetching.</li>
<li>Test reading schedule data from the page.</li>
<li>Test applying schedules to the page.</li>
<li>Test clinic working-hour constraints.</li>
<li>Test loading saved availability.</li>
<li>Test saving valid availability.</li>
<li>Test validation and Firestore failure handling.</li>
</ul>
</td>
</tr>

<tr>
<td>9</td>
<td><code>StaffDashboard.test.js</code></td>
<td>Staff dashboard</td>
<td>
<ul>
<li>Test appointments container exists.</li>
<li>Test stats elements exist.</li>
<li>Test staff sidebar elements exist.</li>
<li>Test staff name element exists.</li>
<li>Test clinic and time element exists.</li>
</ul>
</td>
</tr>

<tr>
<td>10</td>
<td><code>bookAppointments.test.js</code></td>
<td>Patient appointment booking</td>
<td>
<ul>
<li>Test time formatting.</li>
<li>Test distance calculation.</li>
<li>Test geolocation handling.</li>
<li>Test clinic loading and filtering.</li>
<li>Test open-now and near-me filters.</li>
<li>Test time slot rendering.</li>
<li>Test booking validation.</li>
<li>Test saving and rescheduling appointments.</li>
</ul>
</td>
</tr>

<tr>
<td>11</td>
<td><code>dashboard.test.js</code></td>
<td>Patient dashboard</td>
<td>
<ul>
<li>Test dashboard navigation active state.</li>
<li>Test empty and filled dashboard states.</li>
<li>Test avatar initials.</li>
<li>Test signed-in patient loading.</li>
<li>Test upcoming appointment rendering.</li>
<li>Test queue listener replacement.</li>
<li>Test visit count calculation.</li>
<li>Test sign-out behaviour.</li>
</ul>
</td>
</tr>

<tr>
<td>12</td>
<td><code>patientNotifications.test.js</code></td>
<td>Patient notifications</td>
<td>
<ul>
<li>Test notification icon selection.</li>
<li>Test notification time formatting.</li>
<li>Test notification rendering.</li>
<li>Test unread and total counts.</li>
<li>Test notification filters.</li>
<li>Test mark-as-read behaviour.</li>
<li>Test mark-all-read behaviour.</li>
<li>Test clearing and dismissing notifications.</li>
</ul>
</td>
</tr>

<tr>
<td>13</td>
<td><code>waitTimeML.test.js</code></td>
<td>ML wait-time prediction</td>
<td>
<ul>
<li>Test prediction API request payloads.</li>
<li>Test successful wait-time predictions.</li>
<li>Test missing prediction fallback.</li>
<li>Test failed API responses.</li>
<li>Test timeout handling.</li>
<li>Test queue status display updates.</li>
<li>Test Firestore update failure handling.</li>
</ul>
</td>
</tr>

</table>

## Types of Testing Performed

1. Unit tests - they were used for small functions such as:

<ul>
<li>Date formatting.</li>
<li>Time formatting.</li>
<li>No-show rate calculation.</li>
<li>Queue analytics calculation.</li>
<li>Distance calculation.</li>
<li>Status colour selection.</li>
<li>Next available walk-in slot calculation.</li>
<li>Patient notification icon selection.</li>
<li>Wait-time prediction payload formatting.</li>
</ul>

2. Integration-style tests - they were used where multiple behaviours work together, such as:

<ul>
<li>Loading Firestore data and rendering it into the page.</li>
<li>Submitting forms and checking Firestore write calls.</li>
<li>Authenticating users and loading role-specific data.</li>
<li>Listening to appointment or queue updates and updating the DOM.</li>
<li>Filtering clinic, queue, appointment, and notification lists.</li>
<li>Exporting analytics data to CSV and PDF.</li>
</ul>

3. Error Handling Testing

The tests also checked failure scenarios, including:

<ul>
<li>Firestore <code>getDocs</code>, <code>getDoc</code>, <code>setDoc</code>, <code>addDoc</code>, <code>updateDoc</code>, and <code>deleteDoc</code> failures.</li>
<li>Failed staff clinic lookup.</li>
<li>Failed appointment cancellation or rescheduling.</li>
<li>Failed notification updates.</li>
<li>Failed ML prediction requests.</li>
<li>Missing user data.</li>
<li>Empty snapshots.</li>
<li>Invalid form input.</li>
</ul>

## Test Results

The automated test suite passed successfully.

```bash
npm test
```
(../../../../../images/Testing_results.png)