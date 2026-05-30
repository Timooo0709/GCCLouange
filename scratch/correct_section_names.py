import os
import re

directory = "/Users/timothee/Desktop/Site partitions/GCCLouange/content/songs"

replacements = {
    r"\bBridge\b": "Pont",
    r"\bChorus\b": "Refrain",
    r"\bPre-Chorus\b": "Pré-Refrain",
    r"\bVerse\b": "Couplet"
}

modified_files = []

for filename in os.listdir(directory):
    if filename.endswith(".cho"):
        path = os.path.join(directory, filename)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        new_content = content
        # Find all tags start_of_verse, start_of_chorus, start_of_bridge
        tags = re.findall(r"\{(start_of_verse|start_of_chorus|start_of_bridge|start_of_intro|start_of_outro|start_of_coda|start_of_grid|start_of_tab)\s*:\s*([^\}]+)\}", content)
        
        has_change = False
        for tag_type, title in tags:
            new_title = title
            for pattern, repl in replacements.items():
                new_title = re.sub(pattern, repl, new_title, flags=re.IGNORECASE)
            
            if new_title != title:
                old_tag = f"{{{tag_type}: {title}}}"
                new_tag = f"{{{tag_type}: {new_title}}}"
                # Handle spaces inside tag
                # To be robust, let's use regex replace for the tag
                tag_pattern = r"\{" + re.escape(tag_type) + r"\s*:\s*" + re.escape(title) + r"\}"
                new_content = re.sub(tag_pattern, f"{{{tag_type}: {new_title}}}", new_content)
                has_change = True
        
        if has_change:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            modified_files.append((filename, path))

print(f"Total modified files: {len(modified_files)}")
for name, p in modified_files:
    print(f"- {name}")
