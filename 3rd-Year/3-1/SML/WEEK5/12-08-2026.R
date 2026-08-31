# WEEK5 (Cont.):
## 5.1 t test
### ii. Two Sample t test (Test for differences of means_independent samples)
## Example 1:
HorseA = c(28, 30, 32, 33, 33, 29, 34)
HorseB = c(29, 30, 30, 24, 27, 29)
t.test(HorseA, HorseB, mu=0, alternative='two.sided')

### iii. Paired t test (Test for differences of means_dependent samples)
## Example 1:
before = c(12, 14, 11, 8, 7, 10, 3, 0, 5, 6)
after = c(15, 16, 10, 7, 5, 12, 10, 2, 3, 8)
t.test(before, after, paired=TRUE, alternative='two.sided')

## 5.2 Chi-square test
## Example 1:
x = matrix(c(460, 140, 240, 160), ncol=2, nrow=2, byrow=TRUE)
x
chisq.test(x)

## Example 2:
t = matrix(c(230,148,151,471),ncol=2,nrow=2,byrow=TRUE)
t
chisq.test(t)

## 5.3 F-test
## Example 1:
xHorseA = c(28, 30, 32, 33, 33, 29, 34)
yHorseB = c(29, 30, 30, 24, 27, 29)
var.test(yHorseB,xHorseA, alternative='two.sided')

## Example 2:
xEngineerA=c(503,505,497,505,419,493,510,501)
yEngineerB=c(502,497,492,490,495,497,596,498)
var.test(yEngineerB,xEngineerA)
