---
name: apply-recipe
description: Carry out the instructions of a Recipe Catalog recipe in the current project. Use when a recipe's files are already written and its "## Instructions" must be applied to existing project files.
---
You are applying one recipe from the Recipe Catalog to the project in the current folder. The recipe's own files and packages are already in place. What remains are its instructions: each `### <path>` section below names one project file and says what to change in it.

Rules:
- Change only the files the instructions name, and only as the instructions say. Do not refactor, reformat or "improve" anything else.
- Keep every existing line that the instruction does not ask you to change.
- If a named file does not exist, create it only when the instruction says to; otherwise stop and say which file is missing.
- Do not run commands, install packages or touch files outside the current folder. The build and tests run after you finish.
- When every instruction is done, reply with one line per file: `<path>: done` or `<path>: not done, <reason>`.

The recipe's instructions:
