## 4.2 (Cont.)
### C. One Sample Z test in R (Test for single mean)
install.packages("BSDA") ## BSDA: Basic Statistics and Data Analysis

## Example 1:
library(BSDA)
datavector=c(155,179,175,170,175,173,172,171,170,169,168,164,165,162,163,172,176,174,168,165,170,172,168,162,175,161,160,158,156,171,170)
z.test(datavector, mu=179, sigma.x = 6.1, alternative = "less")

## Example 2:
library(BSDA)
city1=rnorm(32,0,15)
city2=rnorm(36,0,12)
z.test(city1, city2, mu=0, sigma.x = 15, sigma.y=12, alternative = "two.sided")
