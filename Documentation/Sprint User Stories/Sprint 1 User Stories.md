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
<td>As a patient, I want to view all my upcoming and past appointments so that I can be able to reschedule or cancel them if needed.</td>
<td>
<ul>
<li><b>Given</b> I have a scheduled appointment, <b>when</b> I open "My Appointments", <b>then</b> it appears under Upcoming.</li>
<li><b>Given</b> I click "Cancel", <b>when</b> I confirm, <b>then</b> the appointment is removed and and put under past appointments.</li>
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
<li><b>Given</b> I am on the Care Queue login page and I select "Patient", <b>When</b> I click "Continue with Google" and complete sign-in, <b>Then</b> I am redirected to the Patient dashboard.</li>
<li><b>Given</b> I am on the Care Queue login page and I select "Staff", <b>When</b> I click "Continue with Google" and complete sign-in, <b>Then</b> I am redirected to the Staff dashboard.</li>
<li><b>Given</b> I am on the Care Queue login page and I select "Admin", <b>When</b> I click "Continue with Google" and complete sign-in, <b>Then</b> a placeholder dashboard is shown and nothing breaks.</li>
<li><b> Given</b> I am signing in for the first time, <b>When</b> I click "Continue with Google" and complete sign-in, <b>Then</b> a confirmation modal appears asking me to confirm my selected role before proceeding.</li>
<li><b>Given</b> I have previously signed in and my role was saved as "Patient", <b>When</b> I return to the login page,<b>Then</b> I am automatically redirected to the Patient dashboard without being prompted to select a role.</b></li>
<li><b>Given</b> I have previously signed in and my role was saved as "Staff", <b>When</b> I return to the login page,<b>Then</b> I am automatically redirected to the Staff dashboard without being prompted to select a role.</b></li>
</ul>
</td>

<td>
<ul>
 <li> Setup Google OAuth authentication</li> 
 <li> Implement role selection( Patient, Staff, Admin)</li>
 <li>Redirect Patient role to patient dashboard after login</li> 
 <li>Test login and redirection flow</li> 
</ul>
</td>
<td align="center">6</td>
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

<td>
As a logged-in patient, I want to see my next appointment details on my dashboard, so that I have a quick overview of my care.
</td>

<td>
<ul>
<li><b>Given</b> I am logged in as a patient with no upcoming appointments, <b>when</b> I open the dashboard, <b>then</b> I see no upcoming appointments message.</li>

<li><b>Given</b> I am logged in as a patient with a booked appointment, <b>when</b> I view the dashboard, <b>then</b> the Next Appointment card displays the clinic name, date, and time.</li>

<li><b>Given</b> a booked appointment, when I view dashboard, then Next Appointment card shows clinic name, date, and time.</li>


</ul>
</td>

<td>
<ul>
<li>Create dashboard UI layout</li>

<li>Display next appointment details</li>

<li>Add "View" button ONLY for the next appointment, which will take you to My Appointment page where you can reschedule/cancel</li>

<li>Add navigation buttons (Find Clinic, Book Appointment, etc.)</li>

<li>Handle empty state when there are no upcoming appointments</li>
</ul>
</td>



<td align="center">5</td>
</tr>




<tr>
<td>5</td>
<td>As a patient, I want to book an appointment at a clinic by selecting a clinic and picking a date and time slot, so that I can secure a consultation without having to queue in person.</td>
<td>
<ul>
<li><b>Given</b> I am on the Book Appointment page, when I search for a clinic by name or area and select one, then the clinic details are shown and I can proceed to the next step.</li>
<li><b>Given</b>a time slot is fully booked, when I view available slots, then I cannot select it since its fully booked.</li>
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
<td align="center">6</td>
</tr>

<tr>
<td>6</td>
<td>As a patient, I want to search for clinics by location or name,
So that I can find clinics near me and view their details before booking an appointment.</td>
<td>
<ul>
<li><b>Given</b> the user is on the dashboard,<b>When</b> they click the "Find Clinic" button <b>then</b> the system navigates to the "Find CLinic" page.</li>
<li><b>Given</b> the system has filtered clinics <b>When</b> the list is displayed,<b>then</b> each clinic shows name, contact number, and basic info. </li>
<li><b>Given</b> the user submits with no matching clinics,<b>When</b> the search is executed,<b>then</b> the system displays a "No results found" message. </li>
<li><b>Given</b> the user submits an empty or invalid search, <b>When</b> the search is executed,<b>then</b> the system prompts the user to enter a valid search term. </li>
</ul>
</td>

<td>
<ul>
<li>Filter clinics by location </li>
<li>Display clinic list</li>
<li>Integrate SA clinic dataset</li>
<li>Handle no result</li>
<li>Create find a clinic UI</li>
<li>Implement search clinic part</li>
<li>Implement near me button</li>
<li>Implement Open Now button</li>
</ul>
</td>

    <td align="center">5</td>
</tr>

</table>
