# Test Plan and Results 

## Testing Strategy
This system was tested using automated unit and integration_style tests which were written with Jest and the jsdom test environment. The objective of testing is to verifiy that the main user workflows work correctly across all roles of the system.

The tests main focus was on:
<li> Checking that each helper function return correct values
<li> Validating form input before the data is saved
<li> Confirming that the pages return render the correct information in the DOM
<li> Testing Firebase inteeracting using the mocked Firestore and Authentication functions
<li> Checking how well the Firebase handles errors when Firebase fails
<li> Verifying the intended behaviour of each role
<li> Testing the ML logic for wait-time

Firebase services were mocked so that tests could run without connecting to the real database which was at first a challenge. 

The tests are stored in the 'testing' folder and can be run with "npm test" or "npm run coverage" in the terminal. 

You could also run coverage for specific scripts, for example: "npm run coverage: analytics"

## Test Environment
The testing was done using the following:
<li> Test Framework: Jest
<li> Test Environment: jsdom
<li> Mocked Services: Firebase Authentication, Firestore, browser APIs, fetch, geolocation, alerts, confirms, alerts, confirms and DOM events
<li> Test location: testing/
<li> Application areas tested: Admin pages, Staff Pages and Patient Pages,