def best_first_search(start, goal, graph, h):
    open_list = [start]
    visited = set()

    print("Search Path: ", end="")

    while open_list:
        # Find the node with the lowest heuristic value in open_list
        minimum = open_list[0]
        for node in open_list:
            if h[node] < h[minimum]:
                minimum = node

        # Remove the selected node from open_list
        open_list.remove(minimum)
        print(minimum, end=" -> ")

        # Check if the goal is reached
        if minimum == goal:
            print("GOAL REACHED")
            return

        visited.add(minimum)

        # Add unvisited neighbors to open_list
        for child in graph[minimum]:
            if child not in visited and child not in open_list:
                open_list.append(child)

    print("Goal not reachable")


# Graph adjacency list
graph = {
    'A': ['S', 'B', 'C'],
    'S': [],
    'B': ['D', 'H'],
    'C': [],
    'D': [],
    'H': ['F', 'G'],
    'F': [],
    'G': ['E'],
    'E': []
}

# Heuristic values (estimated distance to goal)
h = {
    'A': 9,
    'S': 10,
    'B': 7,
    'C': 8,
    'D': 8,
    'H': 6,
    'F': 6,
    'G': 3,
    'E': 0
}

# Static test or user input
start = input('Enter starting node: ').strip().upper()
goal = input('Enter goal node: ').strip().upper()

best_first_search(start, goal, graph, h)