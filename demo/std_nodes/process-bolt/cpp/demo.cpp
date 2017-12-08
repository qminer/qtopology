#include <iostream>
#include <string>

using namespace std;

int main() {
    int cntr = 0;
    while (true) {
        string s;
        cin >> s;
        if (++cntr % 3 == 0) {
            cout << "{ \"count\": " << cntr << "}" << endl;
        }
    }   
    return 0;
}
