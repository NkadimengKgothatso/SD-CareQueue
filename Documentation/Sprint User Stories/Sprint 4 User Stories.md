<h2>User Stories and User Acceptance Tests</h2>

<table border="1">
<tr>
    <th>#</th>
    <th>User Story</th>
    <th>User Acceptance Tests</th>
    <th>Tasks</th>
</tr>

<!-- USER STORY 1 -->
<tr>
<td>1</td>

<td>
As an admin, I want to export clinic reports as CSV or PDF files so that I can analyse data and share insights easily.
</td>

<td>
<ul>
<li>Given the admin is viewing the reports page, when they choose to export a report as CSV, then the system should download the report in CSV format.</li>

<li>Given the admin is viewing the reports page, when they choose to export a report as PDF, then the system should download the report in PDF format.</li>

<li>Given clinic data exists in the system, when the admin exports a report, then the exported file should contain the relevant clinic data.</li>
</ul>
</td>

<td>
<ul>
<li>Generate report data in CSV format</li>
<li>Generate report data in PDF format</li>
<li>Add “Export as CSV” button</li>
<li>Add “Export as PDF” button</li>
</ul>
</td>
</tr>

<!-- USER STORY 2 -->
<tr>
<td>2</td>

<td>
As an admin, I want to access a dashboard that shows key system information so that I can monitor clinic operations efficiently.
</td>

<td>
<ul>
<li>Given clinic, queue, and appointment data exist in Firestore, when the dashboard initializes, then it should correctly calculate and display all statistics.</li>

<li>Given multiple clinics exist, when the dashboard renders, then clinics should be sorted by number of patients in queue (highest first).</li>

<li>Given an admin types in the search bar, when they enter a keyword, then clinics should filter by name, address, or status in real time.</li>
</ul>
</td>

<td>
<ul>
<ul>
<li>Fetch clinics, queues, and appointments from Firestore using getDocs()</li>

<li>Calculate and display main dashboard numbers (active clinics, patients seen, patients in queue)</li>

<li>Display clinic cards sorted by number of patients in queue and allow searching by name, address, or status</li>
</ul>
</td>
</tr>

<!-- USER STORY 3 -->
<tr>
<td>3</td>

<td>
<li>As an admin I want to remove a clinic, So that outdated or closed clinics are no longer visible.</li>
<li>As an admin, I want to set or update clinic opening hours, So that patients know when clinics are available.</li>    
</td>

<td>
<ul>
<li>Given the admin is on the clinic management page, when the admin clicks the “Hours” button, then a popup containing opening hours fields should appear so that the admin can manage clinic hours</li>
<li>Given the popup is open, when the admin views the form, then start day, end day, start time, and end time fields should be displayed so that the admin can enter clinic operating hours.</li>
<li>Given the admin leaves one or more fields empty, when the admin attempts to save, then the system should display a validation error so that incomplete clinic hours are not saved</li>
<li>Given the admin enters an end time earlier than the start time, when the admin clicks “Save”, then the system should reject the submission so that invalid operating hours are prevented</li>
<li>Given clinic hours already exist, when the admin opens the popup again, then the previously saved hours should be displayed so that the admin can review or update them easily.</li>
<li>Given the admin successfully saves clinic hours, when the save process completes, then a success message should appear so that the admin knows the update was successful.</li>
<li>Given clinic hours have been saved, when patients view the clinic information page, then the saved operating hours should be displayed so that patients know when the clinic is available.</li>
</ul>
</td>

<td>
<ul>
<li>implement the hours button</li>
</ul>
</td>
</tr>

<!-- USER STORY 4 -->
<tr>
<td>4</td>

<td>
As a __________, I want __________ so that __________.
</td>

<td>
<ul>
<li>Given __________, when __________, then __________</li>
<li>Given __________, when __________, then __________</li>
<li>Given __________, when __________, then __________</li>
</ul>
</td>

<td>
<ul>
<li>Task 1</li>
<li>Task 2</li>
<li>Task 3</li>
</ul>
</td>
</tr>

<!-- USER STORY 5 -->
<tr>
<td>5</td>

<td>
As a __________, I want __________ so that __________.
</td>

<td>
<ul>
<li>Given __________, when __________, then __________</li>
<li>Given __________, when __________, then __________</li>
<li>Given __________, when __________, then __________</li>
</ul>
</td>

<td>
<ul>
<li>Task 1</li>
<li>Task 2</li>
<li>Task 3</li>
</ul>
</td>
</tr>

<!-- USER STORY 6 -->
<tr>
<td>6</td>

<td>
As a __________, I want __________ so that __________.
</td>

<td>
<ul>
<li>Given __________, when __________, then __________</li>
<li>Given __________, when __________, then __________</li>
<li>Given __________, when __________, then __________</li>
</ul>
</td>

<td>
<ul>
<li>Task 1</li>
<li>Task 2</li>
<li>Task 3</li>
</ul>
</td>
</tr>

</table>
