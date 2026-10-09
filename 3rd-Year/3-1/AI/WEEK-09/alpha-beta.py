# [WEEK-9] Alpha-Beta Pruning
def alphabet(node, alpha, beta, maxplayer):
    if type(node)==int:
        return node
    if maxplayer:
        value = -float('INF')
        for child in node:
            value = max(value,alphabet(child,alpha,beta,False))
            alpha = max(alpha,value)
            if alpha >= beta:
                break
        return value
    else:
        value = float('INF')
        for child in node:
            value = min(value,alphabet(child,alpha,beta,True))
            beta = min(beta,value)
            if alpha >= beta:
                break
        return value
tree = [
    [[2,3],[5,9]],[[0,1],[7,5]]
]
alpha = -float('INF')
beta = float('INF')
print('Best Value = ',alphabet(tree,alpha,beta,True))