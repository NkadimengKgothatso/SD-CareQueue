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
<td></td>

<td>
<ul>

</ul>
</td>

<td>
<ul>

</ul>
</td>

<td align="center"></td>
</tr>

<tr>
<td>4</td>
<td></td>

<td>
<ul>

</ul>
</td>

<td>
<ul>

</ul>
</td>

<td align="center"></td>
</tr>

<tr>
<td>5</td>
<td></td>

<td>
<ul>

</ul>
</td>

<td>
<ul>

</ul>
</td>

<td align="center"></td>
</tr>

<tr>
<td>6</td>
<td></td>

<td>
<ul>

</ul>
</td>

<td>
<ul>

</ul>
</td>

<td align="center"></td>
</tr>

</table>