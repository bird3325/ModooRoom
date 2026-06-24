lines = open('server.js', 'r', encoding='utf-8').readlines()
for i, l in enumerate(lines):
    if "from('contracts')" in l:
        print(f'Line {i+1}: {l.strip()}')
        print(''.join(lines[i+1:i+15]).strip())
        print('---')
