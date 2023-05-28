# Input file path for the dump
input_file = "dump.sql"

# Output file path for the generated SQL script
output_file = "output.sql"

# Open the input file
with open(input_file, "r") as file:
    # Initialize flag and group_lines list
    processing_groups = False
    group_lines = []
    processing_users = False
    user_lines = []

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
                # Remove parentheses and split the line by commas
                values = line[1:-2].split(",")

                # Extract the values
                chatid = values[0].strip()
                title = values[1].strip().strip("'")
                group_type = values[2].strip().strip("'")
                is_silent = values[3].strip()

                # Create the INSERT INTO statement
                insert_statement = f"INSERT INTO \"Group\" (\"chatid\", \"name\", \"type\", \"is_silent\") VALUES ({chatid}, '{title}', '{group_type}', {is_silent});"

                # Add the statement to the group_lines list
                group_lines.append(insert_statement)

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
                # Remove parentheses and split the line by commas
                values = line[1:-2].split(",")

                # Extract the values
                userid = values[0].strip()
                firstname = values[2].strip().strip("'")
                lastname = values[3].strip().strip("'")
                username = values[4].strip().strip("'")
                language = values[5].strip().strip("'")
                cbdata = values[15].strip().strip("'")

                # Create the INSERT INTO statement for the 'User' table
                insert_statement = f"INSERT INTO \"User\" (\"userid\", \"firstname\", \"lastname\", \"username\", \"language\", \"cbdata\") VALUES ({userid}, '{firstname}', '{lastname}', '{username}', '{language}', '{cbdata}');"

                # Add the statement to the user_lines list
                user_lines.append(insert_statement)

            # Break the loop if we have processed the 'users' section
            #if line.endswith(");"):
            #    break

# Write the group lines to the output file
with open(output_file, "w") as output:
    output.writelines("\n".join(group_lines))
    output.writelines("\n".join(user_lines))