# Requirements Document - Reputation Bot 

Authors: GrayNeel, binco97 

Date: 20th May 2023

Version: 1.0

 
| Version number | Change        |
| -------------- | :------------ |
| 1.0            | First version |

# Contents
	
1. [Requirements Document - Reputation Bot](#requirements-document---reputation-bot)
2. [Contents](#contents)
3. [Functional and non functional requirements](#functional-and-non-functional-requirements)
  1. [Functional Requirements](#functional-requirements)
  2. [Non Functional Requirements](#non-functional-requirements)

# Functional and non functional requirements

## Functional Requirements

| ID    | Description                                                                                      | DONE |
| ----- | :----------------------------------------------------------------------------------------------- | ---- |
| FR1   | Manage users and rights (users are GroupMember, GroupAdministrator, Groups, ChatUser, ChatAdmin) | &#9745; |
| FR1.1 | Update user data anytime there is an interaction                                                 | &#9745;   |
| FR1.2 | Handle user reputation (addition/subtract)                                                       | &#9745;   |
| FR1.3 | Reputation management when a user leave a group                                                  | &#9745;   |
| FR1.4 | List all groups where the user is                                                                | &#9745;   |
| FR1.5 | Search a user                                                                                    | &#9744;   |
| FR2   | Handle reputation shop                                                                           | &#9744;   |
| FR2.1 | Handle the possibility to buy products using reputation for a specific group                     | &#9744;   |
| FR3   | Handle levels and badges                                                                         | &#9744;   |
| FR3.1 | User has the possibility to grow levels and badges in a specific group                           | &#9744;   |
| FR4   | Subscription                                                                                     | &#9744;   |
| FR4.1 | Group admins can buy subscription to unlock some features                                        | &#9744;   |
| FR4.2 | Chat members can buy subscription to unlock some features                                        | &#9744;   |
| FR5   | Handle dashboard                                                                                 | &#9744;   |
| FR5.1 | ChatUser and GroupAdministrator can have a look at its status in each group                      | &#9744;   |
| FR6   | Cronjobs for reputation reset on midnight                                                        | &#9745;   |

## Non Functional Requirements

| ID   |    Type     | Description                                                                                        | Refers to |
| ---- | :---------: | :------------------------------------------------------------------------------------------------- | --------: |
| NFR1 |  Usability  | Bot needs to work from time 0 when it is added to a group (and even if removed and re-added later) |    All FR |
| NFR2 | Performance | All functions should complete in < 0.5 sec                                                         |    All FR |
| NFR3 |   Privacy   | The data of a customer should not be disclosed outside the application                             |    All FR |