# WEEK-4 [BFS-DFS]
graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F', 'G'],
    'D': [],
    'E': [],
    'F': [],
    'G': []
}

start = input('Enter Starting Node: ').strip().upper()

def dfs(start):
    stack = [start]
    visited = []
    while stack:
        current = stack.pop()
        if current not in visited:
            visited.append(current)
            for neighbour in reversed(graph[current]):
                if neighbour not in visited:
                    stack.append(neighbour)
    print('DFS:', visited)

def bfs(start):
    queue = [start]
    visited = []
    while queue:
        current = queue.pop(0)  # Dequeue from the front
        if current not in visited:
            visited.append(current)
            for neighbour in graph[current]:
                if neighbour not in visited:
                    queue.append(neighbour)
    print('BFS:', visited)

dfs(start)
bfs(start)