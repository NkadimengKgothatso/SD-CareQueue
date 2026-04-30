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
<td>
As a patient, I want to see estimated wait times  so that I can plan my time better and avoid unnecessary waiting.
</td>

<td>
<ul>
<li>The system shows an estimated wait time based on current queue conditions</li>
<li>Wait time estimates update in real-time (or near real-time)</li>
<li>The system provides average patient wait times by clinic</li>
<li>The system provides average patient wait times by time of day</li>
<li>The system remains accurate and responsive even during peak hours</li>
<li>(Bonus) The system uses a predictive model based on historical queue data, time of day, and day of the week</li>
</ul>
</td>

<td>
<ul>
<li>Implement queue position display</li>
<li>Build wait time calculation logic</li>
<li>Connect real-time Firestore updates</li>
<li>Create analytics for average wait times by clinic</li>
<li>Create analytics for time-of-day trends</li>
<li>Integrate ML-based prediction model (bonus)</li>
</ul>
</td>

<td align="center">9</td>
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
