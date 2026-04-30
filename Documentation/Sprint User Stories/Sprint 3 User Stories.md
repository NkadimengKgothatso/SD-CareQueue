<h2>User Stories and User Acceptance Tests</h2>

<table border="1">
<tr>
    <th>#</th>
    <th>User Story</th>
    <th>User Acceptance Tests</th>
    <th>Tasks</th>
    <th>Story Points</th>
</tr>

<!-- USER STORY 1 -->
<tr>
<td>1</td>
<td>
As a clinic staff member, I want to set my weekly availability so that patients can only book appointments during the days and hours I am actually working.
</td>

<td>
<ul>
<li>When a staff member toggles a day off, the time inputs for that day should become disabled and the row should appear faded</li>
<li>When a staff member clicks "Save Availability", their schedule should be saved to Firestore under the StaffAvailability collection</li>
<li>When a staff member revisits the page, their previously saved availability should load automatically</li>
</ul>
</td>

<td>
<ul>
<li>Create Availability.html with weekly schedule layout</li>
<li>Create Availability.css with page-specific styles</li>
<li>Add "My Availability" nav link to all staff page sidebars</li>
<li>Create StaffAvailability collection in Firestore</li>
<li>Implement toggle logic for enabling/disabling time inputs</li>
<li>Write Availability.js</li>
<li>Test Availability.js functionality</li>
</ul>
</td>

<td align="center"></td>
</tr>

<!-- USER STORY 2 -->
<tr>
<td>2</td>
<tr>
    <td><strong>User Story</strong></td>
    <td>As a patient, I want to see estimated wait times and my queue position so that I can plan my time better and avoid unnecessary waiting.</td>
</tr>

<tr>
    <td><strong>Description</strong></td>
    <td>Allows patients to view their current queue position and estimated waiting time, including insights based on clinic averages and time of day to improve planning and reduce uncertainty.</td>
</tr>

<tr>
    <td><strong>Acceptance Criteria</strong></td>
    <td>
        The system shows an estimated wait time based on current queue conditions.<br>
        Wait time estimates update in real-time (or near real-time).<br>
        The system provides average patient wait times by clinic.<br>
        The system provides average patient wait times by time of day.<br>
        The system remains accurate and responsive even during peak hours.<br>
        (Bonus) The system uses a predictive model to improve wait time estimates based on historical queue data, time of day, and day of the week.
    </td>
</tr>

<tr>
    <td><strong>User Acceptance Tests (UATs)</strong></td>
    <td>
        Given the patient is in the queue, when they view their status, then an estimated wait time is shown.<br>
        Given queue conditions change (such as patients being added or removed), when the system updates, then both queue position and wait time adjust accordingly.
    </td>
</tr>
<td align="center"></td>
</tr>

<!-- USER STORY 3 -->
<tr>
<td>3</td>
<td></td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td align="center"></td>
</tr>

<!-- USER STORY 4 -->
<tr>
<td>4</td>
<td></td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td align="center"></td>
</tr>

<!-- USER STORY 5 -->
<tr>
<td>5</td>
<td></td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td align="center"></td>
</tr>

<!-- USER STORY 6 -->
<tr>
<td>6</td>
<td></td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td>
<ul>
<li></li>
<li></li>
</ul>
</td>
<td align="center"></td>
</tr>

</table>
