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

<td>
As a patient, I want to view all my upcoming and past appointments and be able to reschedule or cancel them if needed.
</td>

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
<li>Display past appointments (placeholder)</li>
<li>Handle case when no appointments exist</li>
<li>Allow cancel and reschedule</li>
<li>Update database when appointment is cancelled</li>
<li>Update database on changes</li>
<li>Implement Track button</li>
</ul>
</td>

<td align="center">8</td>
</tr>
</table>