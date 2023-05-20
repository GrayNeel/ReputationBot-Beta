# Requirements Document - Reputation Bot 

Authors: GrayNeel, binco97 

Date: 20th May 2023

Version: 1.0

 
| Version number | Change        |
| -------------- | :------------ |
| 1.0            | First version |

# Contents
	
- [Requirements Document - Reputation Bot](#requirements-document---reputation-bot)
- [Contents](#contents)
- [Functional and non functional requirements](#functional-and-non-functional-requirements)
  - [Functional Requirements](#functional-requirements)
  - [Non Functional Requirements](#non-functional-requirements)

# Functional and non functional requirements

## Functional Requirements

| ID    | Description                                                                                      |
| ----- | :----------------------------------------------------------------------------------------------- |
| FR1   | Manage users and rights (users are GroupMember, GroupAdministrator, Groups, ChatUser, ChatAdmin) |
| FR1.1 | Update user data anytime there is an interaction                                                 |
| FR1.2 | Handle user reputation (addition/subtract)                                                       |
| FR1.3 | Reputation management when a user leave a group                                                  |
| FR1.4 | List all groups where the user is                                                                |
| FR1.5 | Search a user                                                                                    |
| FR2   | Handle reputation shop                                                                           |
| FR2.1 | Handle the possibility to buy products using reputation for a specific group                     |
| FR3   | Handle levels and badges                                                                         |
| FR3.1 | User has the possibility to grow levels and badges in a specific group                           |
| FR4   | Subscription                                                                                     |
| FR4.1 | Group admins can buy subscription to unlock some features                                        |
| FR4.2 | Chat members can buy subscription to unlock some features                                        |
| FR5   | Handle dashboard                                                                                 |
| FR5.1 | ChatUser and GroupAdministrator can have a look at its status in each group                      |
| FR6   | Cronjobs for reputation reset on midnight                                                        |

## Non Functional Requirements

| ID   |    Type     | Description                                                                                        | Refers to |
| ---- | :---------: | :------------------------------------------------------------------------------------------------- | --------: |
| NFR1 |  Usability  | Bot needs to work from time 0 when it is added to a group (and even if removed and re-added later) |    All FR |
| NFR2 | Performance | All functions should complete in < 0.5 sec                                                         |    All FR |
| NFR3 |   Privacy   | The data of a customer should not be disclosed outside the application                             |    All FR |