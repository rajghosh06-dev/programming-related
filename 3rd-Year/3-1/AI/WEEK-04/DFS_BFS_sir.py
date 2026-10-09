from collections import deque
graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': [],
    'E': [],
    'F': []
}
# DFS
def dfs(start):
    print("DFS:")
    visited = []
    stack = [start]
    while stack:
        node = stack.pop()      # Remove last element
        if node not in visited:
            print(node, end=" ")
            visited.append(node)
            # Add neighbors in reverse order
            for i in reversed(graph[node]):
                stack.append(i)
# BFS
def bfs(start):
    print("\nBFS:")
    visited = [start]
    queue = deque([start])
    while queue:
        node = queue.popleft()   # Remove first element
        print(node, end=" ")
        for i in graph[node]:
            if i not in visited:
                visited.append(i)
                queue.append(i)

dfs('A')
bfs('A')
