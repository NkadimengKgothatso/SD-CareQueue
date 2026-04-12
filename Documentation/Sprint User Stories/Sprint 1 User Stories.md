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
<td>As a patient, I want to view all my upcoming and past appointments and be able to reschedule or cancel them if needed.</td>
<td>
<ul>
<li><b>Given</b> I have a scheduled appointment, <b>when</b> I open "My Appointments", <b>then</b> it appears under Upcoming.</li>
<li><b>Given</b> I click "Cancel", <b>when</b> I confirm, <b>then</b> the appointment is removed and the slot becomes available.</li>
</ul>
</td>
<td>
<ul>
<li>Create “My Appointments” page UI</li>
<li>Display upcoming appointments</li>
<li>Display past appointments</li>
<li>Handle case when no appointments exist</li>
<li>Allow cancel and reschedule</li>
<li>Update database when appointment is cancelled</li>
<li>Update database on changes</li>
<li>Implement Track button to redirect you to Queues page</li>
</ul>
</td>
<td align="center">8</td>
</tr>



<tr>
<td>2</td>
<td>As a patient, clinic staff member, or admin, I want to sign in with my Google account and select whether I am a Patient, Clinic Staff, or Admin, so that I land on the correct dashboard for my role.</td>
  
<td>
<ul>
<li><b>Given</b> I am on the Care Queue login page and I select "Patient", <b>When</b>b> I click "Continue with Google" and complete sign-in, <b>Then</b> I am redirected to the Patient dashboard.</li>
<li><b>Given</b> I am on the Care Queue login page and I select "Clinic Staff" or "Admin", <b>When</b> I click "Continue with Google" and complete sign-in, <b>Then</b> a placeholder message is shown and nothing breaks.</li>
<li><b> Given</b> I am signing in for the first time, <b>When</b> I click "Continue with Google" and complete sign-in, <b>Then</b> a confirmation modal appears asking me to confirm my selected role before proceeding.</li>
<li><b>Given</b> I have previously signed in and my role was saved as "Patient", <b>When</b> I return to the login page,<b>Then</b> I am automatically redirected to the Patient dashboard without being prompted to select a role.</b></li>
<li><b>Given</b> I have previously signed in and my role was saved as "Staff", <b>When</b> I return to the login page,<b>Then</b> I am automatically redirected to the Staff dashboard without being prompted to select a role.</b></li>
</ul>
</td>

<td>...</td>
<td align="center">5</td>
</tr>

<tr>
<td>3</td>
<td>Rea User Story</td>
<td>...</td>
<td>...</td>
<td align="center">5</td>
</tr>

<tr>
<td>4</td>
<td>KG User Story</td>
<td>...</td>
<td>...</td>
<td align="center">5</td>
</tr>

<tr>
<td>5</td>
<td>As a patient, I want to book an appointment at a clinic by selecting a clinic and picking an available date and time slot, so that I can secure a consultation without having to queue in person.</td>
<td>
<ul>
<li><b>Given</b> I am on the Book Appointment page, when I search for a clinic by name or area and select one, then the clinic details are shown and I can proceed to the next step.</li>
<li><b>Given</b> a time slot is fully booked, when I view available slots, then that slot is shown as unavailable and I cannot select it.</li>
<li><b>Given</b> I have selected a clinic, when I choose an available time slot, then I can confirm my appointment and it appears under My Appointments.</li>
</ul>
</td>
<td>
<ul>
<li>Create “Book Appointment” page UI</li>
<li>Allow user to search clinics which are from the clinic json file</li>
<li>Handle case when same time slot is selected at same clinics</li>
<li>Allow to book appointment</li>
<li>Update database when appointment is booked</li>
<li>Implement confirm button to redirect you to My Appointment page</li>
</ul>
</td>
<td align="center">5</td>
</tr>

<tr>
<td>6</td>
<td>Karabo User Story</td>
<td>...</td>
<td>...</td>
<td align="center">5</td>
</tr>

</table>
