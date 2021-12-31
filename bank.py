import json

class Bank():
    def __init__(self):
        self.bank_file = 'bank.json'
        self.bank = None
        self.load()
        self.currency_name = self.bank['currency_name']
        
        
    def commit(self):
        with open(self.bank_file, 'w', encoding='utf-8') as f:
            json.dump(self.bank, f, ensure_ascii=False, indent=4)

    def load(self):
        with open(self.bank_file, 'r') as f:
            self.bank = json.load(f)
        print(self.bank)

    def get_balance(self, user=None):
        report = '{} balance: {}'
        if user and user in self.bank['bank'].keys():
            print(f'retrieving balance for {user}')
            report = report.format(user, self.bank['bank'][user])
        return report
