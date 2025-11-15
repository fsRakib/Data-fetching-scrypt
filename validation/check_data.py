import pandas as pd

df = pd.read_excel('data(5).xlsx')
print('Columns:', df.columns.tolist())
print('\nShape:', df.shape)
print('\nQuestion types:', df['question_type'].unique())
print('\nFirst 2 rows:')
print(df.head(2))
