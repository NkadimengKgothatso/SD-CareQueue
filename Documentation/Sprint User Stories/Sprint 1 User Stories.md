<h2>Additional User Stories and User Acceptance Tests</h2>

<table border="1" cellspacing="0" cellpadding="8" style="border-collapse: collapse; width: 100%;">
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
      As a patient, I want to view all my upcoming and past appointments, and be able to reschedule or cancel them if needed.
    </td>
    
    <td>
      <ul>
        <li><b>Given</b> I have a scheduled appointment, <b>when</b> I open "My Appointments", <b>then</b> it appears under Upcoming Appointments with options to View, Reschedule, and Cancel.</li>
        <li><b>Given</b> I select "Cancel" on an upcoming appointment, <b>when</b> I confirm the action, <b>then</b> the appointment is removed and the time slot becomes available again.</li>
        <li><b>Given</b> I am a logged-in patient with scheduled appointments, <b>when</b> I navigate to "My Appointments", <b>then</b> I can cancel or reschedule an appointment.</li>
      </ul>
    </td>
    
    <td>
      <ul>
        <li>Create “My Appointments” page UI</li>
        <li>Display upcoming appointments</li>
        <li>Display past appointments (placeholder)</li>
        <li>Handle case when no appointments exist</li>
        <li>Allow cancel and reschedule functionality</li>
        <li>Update database when appointment is cancelled</li>
        <li>Update database on changes</li>
        <li>Implement Track button</li>
      </ul>
    </td>
    
    <td style="text-align:center;">8</td>
  </tr>
</table>