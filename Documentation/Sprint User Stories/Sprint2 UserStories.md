<h2> User Stories and User Acceptance Tests</h2>

<table>
<tr>
<th>#</th>
<th>User Story</th>
<th>User Acceptance Test</th>
<th>Tasks</th>
<th>Story Points</th>
</tr>

<tr>
<td>1</td>
<td>As an admin i want to be able to invite staff members so that they can login.</td>
<td>
<ul>
<li><b>Given</b> my email is in the "admins" collection, <b>When</b> I select the "Admin" role <b>Then</b> I am redirected to the Admin Dashboard</li>
<li><b>Given</b> my email is NOT in the "ApprovedStaff" collection, <b>When</b> I select the "Staff" role and sign in with Google, <b>Then</b>  I see an "Access denied" error message.</li>
</ul>
</td>
<td>
<ul>
<li>Create Firestore collections (Admins, ApprovedStaff)</li>
<li>Create Admin portal UI</li>
<li>Able to login as admin</li>
<li>Able to add/invite staff</li>
<li>Able to login as staff</li>
<li>Test UAT scenarios</li>
</ul>
</td>
<td align="center"></td>
</tr>

<tr>
<td>2</td>
<td>As a clinic staff member, I want to register walk-in patients and add them to the appointments system, so that they can be tracked and later managed in the queue.</td>
<td>
<ul>
<li><b>Given</b> a patient arrives at the clinic without an appointment, <b>When</b> the staff member registers the patient and adds them to the appointments, <b>Then</b> the patient name should appear in the walk in table</li>

<li><b>Given</b> a walk-in patient is registered, <b>When</b> the registration is complete, <b>Then</b> the patient’s details should be stored in the Appointments collection in Firebase</li>

<li><b>Given</b> a walk-in patient is registered, <b>When</b> the record is created, <b>Then</b> the patient's status should be set to "Waiting"</li>
</ul>
</td>
<td>
<ul>
<li>Create staff interface to register or search for a patient</li>
<li>Use Firebase addDoc to add walk-in patients to Appointments collection</li>
<li>Display the time the walk-in patient will be seen</li>
<li>Set default patient status to "Waiting"</li>
<li>Display walk-in patients on walk-in page</li>
</ul>
</td>
<td align="center">8</td>
</tr>

<tr>
<td>3</td>
<td>As a patient, I want a simple and accurate dashboard so that I can easily view my queue details and appointments without confusion.</td>

<td>
<ul>
<li><b>Given</b> no upcoming appointments, <b>When</b> I open the dashboard, <b>Then</b> I see a clear “no upcoming appointments” message in the Next Appointment card</li>

<li><b>Given</b> a booked appointment, <b>When</b> I open the dashboard, <b>Then</b> Next Appointment shows clinic name, date, and time correctly</li>

<li><b>Given</b> I view the queue section, <b>When</b> data loads, <b>Then</b> I see correct position, estimated wait time, and queue status</li>

<li><b>Given</b> I open the dashboard, <b>When</b> it loads, <b>Then</b> I do NOT see service score or analytics anywhere</li>

<li><b>Given</b> I interact with the dashboard, <b>When</b> data is missing, <b>Then</b> I see meaningful empty states instead</li>
</ul>
</td>

<td>
<ul>
<li>Create clean dashboard UI layout</li>
<li>Replace all dummy variables with real data bindings</li>
<li>Implement correct queue details (position, wait time, status)</li>
<li>Remove service score feature from UI and logic</li>
<li>Remove analytics section completely</li>
<li>Ensure empty states display properly</li>
<li>Ensure dashboard shows only patient-relevant information</li>
<li>Add navigation buttons (Find Clinic, Book Appointment, View Appointments)</li>
</ul>
</td>

<td align="center">8</td>
</tr>

<tr>
<td>4</td>
<td>As a staff member, I want to manage the queue so that I can track patient progress and update their status in real time</td>

<td>
<ul>
<li><b>Given</b> I am a logged in staff member <b>when</b> I click on Queue Management, <b>then</b> I should see the list of patients in the queue</li>
<li><b>Given</b> a patient is in the queue <b>when</b> I change the status of their appointments <b>then</b> it should update immediately</li>
<li><b>Given</b> another staff member updates a patient’s status, <b>when</b> I am viewing the queue page, <b>then</b> I should see the update in real time</li>
</ul>
</td>

<td>
<ul>
<li>Match UI to prototype<li>
<li>Delete Walk In Button</li>
<li>Make clicking button on side bar to cause an event</li>
<li>Update the queue list in real time</li>
</ul>
</td>

<td align="center"></td>
</tr>

<tr>
<td>5</td>
<td><ul>
<li>As an admin, I want to add a new clinic, so that it becomes available for patients to book appointments.</li>
<li>As an admin, I want to view a list of all clinics, so that it becomes available for patients to book appointments.</li>
<li>As an admin, I want to edit clinic details (name, location, hours), so that the information stays accurate.</li>
<li>As an admin, I want to remove a clinic, so that outdated or closed clinics are no longer visible.</li>
<li>As an admin, I want to set or update clinic opening hours, so that patients know when clinics are available.</li>
<li>As an admin, I want to search for a clinic by name or location, so that I can quickly find specific clinics.</li>
</ul></td>

<td>
<ul>
<!-- ADD CLINIC -->
<li><b>Given</b> I am a logged in admin <b>when</b> I add a new clinic with valid details <b>then</b> the clinic should be successfully created and available for patients</li>

<li><b>Given</b> I am adding a new clinic <b>when</b> I submit the form with missing required fields <b>then</b> I should see validation errors and the clinic should not be created</li>


<!-- VIEW CLINICS -->
<li><b>Given</b> I am a logged in admin <b>when</b> I navigate to the clinics page <b>then</b> I should see a list of all clinics</li>


<!-- EDIT CLINIC -->
<li><b>Given</b> I am viewing a clinic <b>when</b> I update its details and save <b>then</b> the changes should be stored and displayed correctly</li>



<li><b>Given</b> I update a clinic’s details <b>when</b> I return to the clinics list <b>then</b> the updated details should be visible</li>

<!-- REMOVE CLINIC -->
<li><b>Given</b> I am viewing a clinic <b>when</b> I delete the clinic <b>then</b> it should no longer appear in the clinics list</li>

<li><b>Given</b> I attempt to delete a clinic <b>when</b> I confirm the action <b>then</b> the clinic should be permanently removed</li>

<li><b>Given</b> I attempt to delete a clinic <b>when</b> I cancel the action <b>then</b> the clinic should remain unchanged</li>

<!-- CLINIC HOURS -->
<li><b>Given</b> I am a logged in admin <b>when</b> I set clinic opening hours <b>then</b> the hours should be saved and visible to patients</li>

<li><b>Given</b> I update clinic hours <b>when</b> I save changes <b>then</b> the updated hours should overwrite the previous ones</li>

<li><b>Given</b> I enter invalid hours (e.g. closing before opening) <b>when</b> I submit <b>then</b> the system should show an error</li>

<!-- SEARCH -->
<li><b>Given</b> I am on the clinics page <b>when</b> I search by clinic name or location <b>then</b> matching clinics should be displayed</li>

<li><b>Given</b> I search for a clinic <b>when</b> no match is found <b>then</b> I should see a "no results found" message</li>
</ul>
</td>

<td>
<ul>
<li>Implement clinic management UI </li>
<li>Implement Add Clinic button</li>
<li>Implement manage button</li>
</ul>
</td>

<td align="center"></td>
</tr>

<tr>
<td>6</td>
<td>As a staff member, I want to see the upcoming appointments so that I can prepare in advance and manage my schedule</td>

<td>
<ul>

<li><b>Given</b> there are no upcoming appointments <b>when</b> I open the appointments page ,  <b>then</b> I should see a message like “No upcoming appointments” </li>
<li><b>Given</b> there are many appointments <b>when</b> I open the appointments page, <b>then</b> the list should load within an acceptable time (under 2 seconds)</li>
<li><b>Given</b> I am logged in as a staff member, <b>when</b> I navigate to the appointments section, <b>then</b> I should see a list of all upcoming appointments of today and the list should be sorted by time (earliest first)</li>
<li><b>Given</b> new appointments are added or existing ones are updated, <b>when</b> I refresh or revisit the page, <b>then</b> I should see the latest and accurate appointment data</li>
</ul>
</td>

<td>
<ul>
<li>Display the staff's name and their assigned clinic<li>
<li>Display the day's statistics of the clinic</li>
<li>Display upcoming appointments in the dashboard</li>
<li>Create UI for the dashboard</li>
</ul>
</td>

<td align="center">7</td>
</tr>

</table>
