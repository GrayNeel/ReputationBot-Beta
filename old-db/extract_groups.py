# Input file path for the dump
input_file = "dump.sql"

# Output file path for the generated SQL script
output_file = "output.sql"

# Open the input file
with open(file = input_file, mode = "r", encoding = "utf-8") as file:
    # Initialize flag and group_lines dictionary
    processing_groups = False
    group_lines = {}

    # Initialize flag and user_lines dictionary
    processing_users = False
    user_lines = {}
    
    user_in_group_lines = []

    # Read the file line by line
    for line in file:
        # Check if we have entered the 'groups' section
        if line.startswith("INSERT INTO `groups` (`chatid`, `title`, `type`, `is_silent`) VALUES"):
            processing_groups = True
            continue

        # Process lines within 'groups' section
        if processing_groups:
            # Remove leading and trailing characters from the line
            line = line.strip()

            # Check if the line matches the expected format
            if line.startswith("(") and line.endswith("),"):
                # Remove parentheses and split the line by tick + comma + space to isolate string fields
                split_on_strings_values = line[1:-2].split("', ")
                # divide chat id from the title
                id_and_title = split_on_strings_values[0].split(", ")

                # Extract the chatid
                chatid = id_and_title[0].strip()
                # compose the title string by joining the values from id_and_title[1:]
                preprocessed_title = ", ".join(id_and_title[1:])
                title = preprocessed_title.strip().strip("'").replace("\\'", "'").replace("'", "''")
                # get the group type
                group_type = split_on_strings_values[1].strip().strip("'")
                if split_on_strings_values[2].strip() == "1": # is_silent
                    is_silent = "true"
                else:
                    is_silent = "false"

                # Create the INSERT INTO statement
                insert_statement = f"INSERT INTO \"Group\" (\"chatid\", \"name\", \"type\", \"is_silent\") VALUES ({chatid}, '{title}', '{group_type}', {is_silent});"
                
                # add the entry chatid: insert_statement to the group_lines dictionary
                group_lines[chatid] = insert_statement

            # Break the loop if we have processed the 'groups' section
            if line.endswith(");"):
                processing_groups = False
                break
    
    # Read the file line by line
    for line in file:
        # Check if we have entered the 'users' section
        if line.startswith("INSERT INTO `users` (`userid`, `chatid`, `firstname`, `lastname`, `username`, `language`, `joindate`, `lastdate`, `reputation`, `reputation_today`, `messages`, `messages_today`, `up_available`, `down_available`, `beast_mode`, `cbdata`) VALUES"):
            processing_users = True
            continue

        # Process lines within 'users' section
        if processing_users:
            # Remove leading and trailing characters from the line
            line = line.strip()

            # Check if the line matches the expected format
            if line.startswith("(") and (line.endswith("),") or line.endswith(");")) :
                # Remove parentheses and split the line by tick + comma + space to isolate string fields
                split_on_strings_values = line[1:-2].split("', '")
                # Remove parentheses and split the line by commas+space
                usr_chat_firstname = split_on_strings_values[0].split(", ")

                # Extract the values
                userid = usr_chat_firstname[0].strip()
                #print(userid)
                chatid = usr_chat_firstname[1].strip()
                # compose the firstname string by joining the values from usr_chat_firstname[2:]
                preprocessed_firstname = ", ".join(usr_chat_firstname[2:])
                firstname = preprocessed_firstname.strip().strip("'").replace("\\'", "'").replace("'", "''")

                # process the string values
                lastname = split_on_strings_values[1].strip().strip("'").replace("\\'", "'").replace("'", "''")
                username = split_on_strings_values[2].strip().strip("'").replace("\\'", "'").replace("'", "''")
                language = split_on_strings_values[3].strip().strip("'")
                first_seen = split_on_strings_values[4].strip().strip("'")

                # get the values from reputation to cbdata splitting by commas+space
                from_lastdate_to_cbdata = split_on_strings_values[5].split(", ")
                
                last_seen = from_lastdate_to_cbdata[0].strip().strip("'")
                reputation = from_lastdate_to_cbdata[1].strip()
                reputation_today = from_lastdate_to_cbdata[2].strip()
                messages = from_lastdate_to_cbdata[3].strip()
                messages_today = from_lastdate_to_cbdata[4].strip()
                up_available = from_lastdate_to_cbdata[5].strip()
                down_available = from_lastdate_to_cbdata[6].strip()

                if from_lastdate_to_cbdata[7].strip() == "1":
                    beast_mode = "true"
                else:
                    beast_mode = "false"
                
                # compose the cbdata string by joining the values from from_lastdate_to_cbdata[7:]
                preprocessed_cbdata = ", ".join(from_lastdate_to_cbdata[8:])
                cbdata = preprocessed_cbdata.strip().strip("'").replace("\\'", "'").replace("'", "''")

                # Create the INSERT INTO statement for the 'User' table
                insert_statement = f"INSERT INTO \"User\" (\"userid\", \"firstname\", \"lastname\", \"username\", \"language\", \"cbdata\") VALUES ({userid}, '{firstname}', '{lastname}', '{username}', '{language}', '{cbdata}');"
                
                # add the entry userid: insert_statement to the user_lines dictionary
                user_lines[userid] = insert_statement

                # avoid inserting the private chats (where chatid == userid)
                if chatid != userid:
                    # Create the INSERT INTO statement for the 'user_in_group' table
                    insert_statement = f"INSERT INTO \"user_in_group\" (\"id\", \"userid\", \"chatid\", \"is_admin\", \"first_seen\", \"last_seen\", \"reputation\", \"reputation_today\", \"messages\", \"messages_today\", \"up_available\", \"down_available\", \"beast_mode\") VALUES (default, {userid}, {chatid}, false, '{first_seen}', '{last_seen}', {reputation}, {reputation_today}, {messages}, {messages_today}, {up_available}, {down_available}, {beast_mode});"

                    # Add the statement to the user_in_group_lines list
                    user_in_group_lines.append(insert_statement)


# Write the group lines to the output file
with open(file = output_file, mode = "w", encoding = "utf-8") as output:
    output.writelines("\n".join(user_lines.values()))
    output.writelines("\n".join(group_lines.values()))
    output.writelines("\n".join(user_in_group_lines))