# 9.2 K-means Clustering in R 

install.packages("factoextra")
library(factoextra)

## Example-1:
fviz_nbclust(data_ex1_3009, kmeans, method = "wss", k.max = 8)
clust=kmeans(data_ex1_3009,2) 
clust
fviz_cluster(clust,data_ex1_3009)

## Example-2:
fviz_nbclust(data_ex2_3009, kmeans, method = "wss", k.max = 11)
clust=kmeans(data_ex2_3009,2)
clust
fviz_cluster(clust,data_ex2_3009)
