import json

# Read the original input
with open('input.json', 'r') as f:
    data = json.load(f)

# Scale all values in 'a' and 'b' by 1000
scaled_data = {
    'b': [int(x * 1000) for x in data['b']]
}

# Write the scaled input to a new file
with open('input_scaled.json', 'w') as f:
    json.dump(scaled_data, f) 