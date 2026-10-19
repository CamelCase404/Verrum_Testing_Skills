from fastapi import APIRouter

from ..schemas import CatalogOption, CatalogResponse, StackOption

router = APIRouter(prefix="/api", tags=["catalog"])


def _opt(id: str, name: str, icon: str, description: str) -> CatalogOption:
    return CatalogOption(id=id, name=name, icon=icon, description=description)


LEVELS = [
    _opt(
        "junior",
        "Разработчик Junior",
        "Seedling",
        "Анализ портфолио: базовые знания, обучаемость, аккуратность в коде.",
    ),
    _opt(
        "middle",
        "Разработчик Middle",
        "Sprout",
        "Портфолио + собеседование: самостоятельные решения, архитектура, trade-offs.",
    ),
    _opt(
        "senior",
        "Разработчик Senior",
        "TreeDeciduous",
        "Портфолио + собеседование + проект: системное мышление, влияние на команду.",
    ),
]

STACKS = [
    StackOption(
        id="mobile-ios",
        name="Mobile (iOS)",
        icon="Smartphone",
        description="Нативная разработка под iOS",
        languages=[
            _opt("swift", "Swift", "Swift", "Основной язык iOS"),
            _opt("objc", "Objective-C", "Braces", "Legacy-код iOS"),
            _opt("swiftui", "SwiftUI", "Layers", "Декларативный UI"),
            _opt("uikit", "UIKit", "LayoutGrid", "Классический UI"),
            _opt("combine", "Combine", "Waves", "Реактивные потоки"),
        ],
    ),
    StackOption(
        id="mobile-android",
        name="Mobile (Android)",
        icon="Smartphone",
        description="Нативная разработка под Android",
        languages=[
            _opt("kotlin", "Kotlin", "Code2", "Основной язык Android"),
            _opt("java", "Java", "Coffee", "Классический Android"),
            _opt("compose", "Jetpack Compose", "Layers", "Декларативный UI"),
            _opt("coroutines", "Kotlin Coroutines", "Waves", "Асинхронность"),
        ],
    ),
    StackOption(
        id="frontend",
        name="Frontend",
        icon="Monitor",
        description="Клиентская веб-разработка",
        languages=[
            _opt("js", "JavaScript", "Braces", "Базовый язык веба"),
            _opt("ts", "TypeScript", "FileCode2", "Типизированный JS"),
            _opt("react", "React", "Atom", "Библиотека UI"),
            _opt("next", "Next.js", "Layers", "SSR/SSG React"),
            _opt("vue", "Vue", "Hexagon", "Прогрессивный фреймворк"),
            _opt("svelte", "Svelte", "Flame", "Компилируемый UI"),
        ],
    ),
    StackOption(
        id="backend",
        name="Backend",
        icon="Server",
        description="Серверная разработка",
        languages=[
            _opt("python", "Python", "FileCode2", "Универсальный язык"),
            _opt("fastapi", "FastAPI", "Zap", "Асинхронный Python-фреймворк"),
            _opt("django", "Django", "Boxes", "Batteries-included"),
            _opt("go", "Go", "Rabbit", "Компилируемый, быстрый"),
            _opt("node", "Node.js", "Hexagon", "JS на сервере"),
            _opt("java", "Java", "Coffee", "JVM-стек"),
            _opt("kotlin", "Kotlin", "Code2", "JVM + Native"),
            _opt("rust", "Rust", "Flame", "Безопасная системщина"),
            _opt("csharp", "C#", "Hash", ".NET-стек"),
        ],
    ),
    StackOption(
        id="gamedev",
        name="GameDev",
        icon="Gamepad2",
        description="Разработка игр",
        languages=[
            _opt("unity", "Unity (C#)", "Gamepad2", "Кроссплатформенный движок"),
            _opt("unreal", "Unreal (C++)", "Boxes", "AAA-движок"),
            _opt("godot", "Godot (GDScript)", "Hexagon", "Открытый движок"),
        ],
    ),
    StackOption(
        id="devops",
        name="DevOps / SRE",
        icon="Cloud",
        description="Инфраструктура и эксплуатация",
        languages=[
            _opt("docker", "Docker", "Box", "Контейнеризация"),
            _opt("k8s", "Kubernetes", "Ship", "Оркестрация"),
            _opt("terraform", "Terraform", "Layers", "IaC"),
            _opt("ansible", "Ansible", "Wrench", "Автоматизация"),
            _opt("bash", "Bash", "Terminal", "Скрипты"),
        ],
    ),
    StackOption(
        id="data",
        name="Data / ML",
        icon="Brain",
        description="Анализ данных и ML",
        languages=[
            _opt("python", "Python", "FileCode2", "Основной язык"),
            _opt("pandas", "Pandas", "Table", "Табличные данные"),
            _opt("pytorch", "PyTorch", "Flame", "DL-фреймворк"),
            _opt("tensorflow", "TensorFlow", "Brain", "DL-фреймворк"),
            _opt("sql", "SQL", "Database", "Работа с данными"),
        ],
    ),
]


@router.get("/catalog", response_model=CatalogResponse)
def catalog() -> CatalogResponse:
    return CatalogResponse(levels=LEVELS, stacks=STACKS)
